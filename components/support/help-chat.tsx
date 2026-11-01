"use client";

import { ImagePlus, LifeBuoy, Mail, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { helpChatAction, myReportsAction } from "@/app/[locale]/(main)/help-actions";
import type { ThreadSummary } from "@/lib/data/support-threads";
import { submitSupportAction } from "@/app/[locale]/(main)/support-actions";
import { Link } from "@/i18n/navigation";
import { VoiceButton } from "@/components/match/voice-button";
import { RichReply } from "@/components/support/rich-reply";
import { HELP_OPEN_EVENT } from "@/lib/help/open-event";
import { matchTopics, composeReport, type HelpDraft, type HelpKind, type HelpTopic } from "@/lib/help/topics";
import { compressForRequest, POST_UPLOAD } from "@/lib/media/image-compress";
import { cn } from "@/lib/utils";

const VideoField = dynamic(() => import("@/components/support/media-inputs").then((m) => m.VideoField));
const VoiceNoteField = dynamic(() => import("@/components/support/media-inputs").then((m) => m.VoiceNoteField));

// The help chat (docs/62): a button on every page that opens a short chat.
// Guided mode needs no AI: a few questions, then a report into the same queue
// as /support, which the bug agent works through (docs/61). With Claude set up
// (helpAiEnabled), the conversation is free text and Claude drafts the report.
// Nothing is filed until the person taps Send.

// /support offers the chat as one of its two choices, so there it opens from the page, without the floating button.
const BUTTONLESS = /\/support(\/|$)/;
const HIDDEN = /\/(match|portfolio-setup|admin|pioneer-letters|chats)(\/|$)|\/studio\/(import|inbox|messages)(\/|$)/;

type Line = { from: "bot" | "me"; text: string; topics?: HelpTopic[] };
type Step = "menu" | "what" | "steps" | "expected" | "shot" | "howto" | "helped" | "notFound" | "review" | "sent" | "ai";

export function HelpChat({ aiEnabled, aboveNav = false }: { aiEnabled: boolean; aboveNav?: boolean }) {
  const t = useTranslations("Help");
  const tm = useTranslations("SupportMedia");
  const locale = useLocale();
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState(aiEnabled);
  const [lines, setLines] = useState<Line[]>([]);
  const [step, setStep] = useState<Step>("menu");
  const [draft, setDraft] = useState<HelpDraft>({ kind: "bug", what: "" });
  const [shot, setShot] = useState<File | null>(null);
  const [voice, setVoice] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [text, setText] = useState("");
  const [statuses, setStatuses] = useState<ThreadSummary[]>([]);
  const [pending, startTransition] = useTransition();
  const picker = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines, step]);
  // Tucked away while scrolling down (reading or filling a form), back on any scroll up or at the top.
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 12) return;
      setTucked(y > last && y > 120);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Their reports and any unread reply (the dot on the Help button), on load and whenever the chat opens.
  useEffect(() => {
    myReportsAction().then(setStatuses).catch(() => {});
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Opened from the page (the "Chat now" choice on /support).
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      if (!lines.length) setStep(ai ? "ai" : "menu");
    };
    window.addEventListener(HELP_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(HELP_OPEN_EVENT, onOpen);
  }, [ai, lines.length]);

  if (HIDDEN.test(path)) return null;

  const say = (...l: Line[]) => setLines((prev) => [...prev, ...l]);
  const restart = () => {
    setLines([]);
    setDraft({ kind: "bug", what: "" });
    setShot(null);
    setVoice(null);
    setVideo(null);
    setStep(ai ? "ai" : "menu");
  };

  function choose(kind: HelpKind | "howto") {
    say({ from: "me", text: kind === "howto" ? t("choices.howto") : t(`choices.${kind}`) });
    if (ai) return askAi(kind === "howto" ? t("choices.howto") : t(`choices.${kind}`));
    if (kind === "howto") {
      say({ from: "bot", text: t("ask.howto") });
      return setStep("howto");
    }
    setDraft({ kind, what: "" });
    say({ from: "bot", text: kind === "complaint" ? t("ask.complaint") : kind === "suggestion" ? t("ask.suggestion") : t("ask.what") });
    setStep("what");
  }

  function askAi(message: string) {
    const history = [...lines, { from: "me" as const, text: message }]
      .filter((l) => l.text.trim())
      .slice(-16)
      .map((l) => ({ role: l.from === "me" ? ("user" as const) : ("assistant" as const), content: l.text.slice(0, 1500) }));
    // The API wants the conversation to start with the person.
    while (history.length && history[0].role !== "user") history.shift();
    startTransition(async () => {
      const result = await helpChatAction(history, path).catch(() => ({ mode: "guided" as const }));
      if (result.mode === "limited") return say({ from: "bot", text: t("limited") });
      if (result.mode === "guided") {
        setAi(false);
        say({ from: "bot", text: t("greeting") });
        return setStep("menu");
      }
      if (result.reply.reply) say({ from: "bot", text: result.reply.reply });
      if (result.reply.draft) {
        setDraft(result.reply.draft);
        say({ from: "bot", text: t("ask.shot") });
        setStep("shot");
      }
    });
  }

  function answer(value: string) {
    const v = value.trim();
    if (step === "ai") {
      if (!v) return;
      say({ from: "me", text: v });
      return askAi(v);
    }
    if (v) say({ from: "me", text: v });
    else say({ from: "me", text: t("skip") });
    if (step === "what") {
      if (!v) return;
      setDraft((d) => ({ ...d, what: v }));
      if (draft.kind === "bug") {
        say({ from: "bot", text: t("ask.steps") });
        return setStep("steps");
      }
      if (draft.kind === "suggestion") return setStep("review");
      say({ from: "bot", text: t("ask.shot") });
      return setStep("shot");
    }
    if (step === "steps") {
      setDraft((d) => ({ ...d, steps: v }));
      say({ from: "bot", text: t("ask.expected") });
      return setStep("expected");
    }
    if (step === "expected") {
      setDraft((d) => ({ ...d, expected: v }));
      say({ from: "bot", text: t("ask.shot") });
      return setStep("shot");
    }
    if (step === "howto") {
      if (!v) return;
      const found = matchTopics(v);
      setDraft({ kind: "question", what: v });
      if (!found.length) {
        say({ from: "bot", text: t("notFound") });
        return setStep("notFound");
      }
      say({ from: "bot", text: t("found"), topics: found }, { from: "bot", text: t("helped") });
      return setStep("helped");
    }
  }

  function send() {
    startTransition(async () => {
      const data = new FormData();
      data.set("kind", draft.kind);
      data.set("message", composeReport(draft));
      data.set("from", path);
      // A chat report is followed in the chat itself: no emails (docs/62).
      data.set("channel", "chat");
      data.set("viewport", `${window.innerWidth}x${window.innerHeight}`);
      if (shot) for (const f of await compressForRequest([shot], POST_UPLOAD).catch(() => [shot])) data.append("screenshots", f);
      if (voice) data.set("voice", voice);
      if (video) data.set("video", video);
      const result = await submitSupportAction(undefined, data).catch(() => undefined);
      if (!result?.done || !result.ref) return say({ from: "bot", text: t("sendFailed") });
      say({ from: "bot", text: t("sent", { ref: result.ref }) });
      myReportsAction().then(setStatuses).catch(() => {});
      setStep("sent");
    });
  }

  const chip = "rounded-full border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50";
  const typing = step === "what" || step === "steps" || step === "expected" || step === "howto" || step === "ai";
  const skippable = step === "steps" || step === "expected";

  return (
    <>
      {!open && !BUTTONLESS.test(path) && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            if (!lines.length) restart();
          }}
          // On phones a small round icon that steps aside while the page scrolls down, so it never sits on a
          // tab, a share button or a form field for long; the word "Help" shows from tablet width up.
          className={cn(
            "fixed end-3 z-40 flex size-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg transition-[transform,opacity] duration-200 hover:opacity-90 md:end-4 md:size-auto md:px-4 md:py-2.5",
            aboveNav ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6" : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
            tucked && "pointer-events-none translate-y-4 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100",
          )}
          aria-label={t("open")}
          data-testid="help-open"
        >
          <LifeBuoy className="size-5 md:size-4" aria-hidden /> <span className="sr-only md:not-sr-only">{t("open")}</span>
          {statuses.some((s) => s.unread) && <span className="size-2.5 rounded-full bg-destructive ring-2 ring-primary" aria-label={t("newReply")} data-testid="help-unread" />}
        </button>
      )}
      {open && (
        <section
          role="dialog"
          aria-label={t("title")}
          className={cn(
            "fixed inset-x-2 z-50 flex max-h-[min(36rem,80dvh)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:inset-x-auto sm:end-4 sm:w-96",
            aboveNav ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6" : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
          )}
          data-testid="help-chat"
          data-mode={ai ? "ai" : "guided"}
        >
          <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <LifeBuoy className="size-4 text-primary" aria-hidden /> {t("title")}
            </h2>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="rounded-md p-1 hover:bg-muted" data-testid="help-close">
              <X className="size-4" />
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
            {statuses.length > 0 && (
              <div className="rounded-xl bg-muted/60 p-3 text-xs" data-testid="help-statuses">
                <p className="mb-1 font-semibold">{t("yourReports")}</p>
                <ul className="space-y-0.5">
                  {statuses.slice(0, 5).map((s) => (
                    <li key={s.ref}>
                      <Link href={`/support/t/${s.token}`} className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-background" data-testid="help-thread-link" onClick={() => setOpen(false)}>
                        <span className="flex items-center gap-1.5 font-mono" dir="ltr">
                          {s.unread && <span className="size-2 rounded-full bg-destructive" aria-hidden />}
                          {s.ref}
                        </span>
                        <span data-testid="help-status">{s.unread ? t("newReply") : t(`status.${s.status}`)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="max-w-[85%] rounded-2xl rounded-ss-sm bg-muted px-3 py-2">{t("greeting")}</p>
            {lines.map((l, i) => (
              <div key={i} className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2", l.from === "me" ? "ms-auto rounded-se-sm bg-primary text-primary-foreground" : "rounded-ss-sm bg-muted")} dir="auto">
                {l.from === "bot" ? <RichReply text={l.text} /> : l.text}
                {l.topics && (
                  <ul className="mt-2 space-y-2" data-testid="help-topics">
                    {l.topics.map((topic) => (
                      <li key={topic.id} className="rounded-lg bg-background p-2">
                        <p className="font-semibold">{t(`topics.${topic.id}.title` as "topics.addProject.title")}</p>
                        <p className="text-muted-foreground">{t(`topics.${topic.id}.answer` as "topics.addProject.answer")}</p>
                        <Link href={topic.link} className="text-xs font-medium text-primary" onClick={() => setOpen(false)}>
                          {t("openPage")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {(step === "menu" || (step === "ai" && lines.length === 0)) && (
              <div className="flex flex-wrap gap-2" data-testid="help-menu">
                {(["bug", "complaint", "howto", "suggestion"] as const).map((k) => (
                  <button key={k} type="button" className={chip} onClick={() => choose(k)} disabled={pending}>
                    {t(`choices.${k}`)}
                  </button>
                ))}
              </div>
            )}
            {step === "helped" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={chip} onClick={() => { say({ from: "me", text: t("yes") }, { from: "bot", text: t("thanks") }); setStep("sent"); }}>{t("yes")}</button>
                <button type="button" className={chip} onClick={() => { say({ from: "me", text: t("no") }); setStep("review"); }}>{t("no")}</button>
              </div>
            )}
            {step === "notFound" && (
              <button type="button" className={chip} onClick={() => setStep("review")}>{t("sendQuestion")}</button>
            )}
            {step === "shot" && (
              <div className="space-y-3 rounded-xl border p-3" data-testid="help-attach">
                <label className={cn(chip, "flex w-fit cursor-pointer items-center gap-1.5")}>
                  <ImagePlus className="size-4" aria-hidden /> {shot ? t("shotAdded") : t("addShot")}
                  <input
                    ref={picker}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    data-testid="help-shot-input"
                    onChange={(e) => setShot(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="space-y-1">
                  <p className="text-xs font-medium">{t("addVoice")}</p>
                  <VoiceNoteField value={voice} onChange={setVoice} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">{t("addVideo")}</p>
                  <VideoField value={video} onChange={setVideo} onBusy={setVideoBusy} />
                </div>
                <button
                  type="button"
                  className={chip}
                  disabled={videoBusy}
                  data-testid="help-attach-continue"
                  onClick={() => {
                    const added = [shot && t("shotAdded"), voice && t("voiceAdded"), video && t("videoAdded")].filter(Boolean).join(" · ");
                    say({ from: "me", text: added || t("skip") });
                    setStep("review");
                  }}
                >
                  {shot || voice || video ? t("continue") : t("skip")}
                </button>
              </div>
            )}
            {step === "review" && (
              <div className="space-y-2 rounded-xl border p-3" data-testid="help-review">
                <p className="font-medium">{t("review")}</p>
                <dl className="space-y-1 text-xs">
                  <div><dt className="inline font-semibold">{t("draft.kind")}: </dt><dd className="inline">{t(`kinds.${draft.kind}`)}</dd></div>
                  <div><dt className="inline font-semibold">{t("draft.what")}: </dt><dd className="inline" dir="auto">{draft.what}</dd></div>
                  {draft.steps && <div><dt className="inline font-semibold">{t("draft.steps")}: </dt><dd className="inline" dir="auto">{draft.steps}</dd></div>}
                  {draft.expected && <div><dt className="inline font-semibold">{t("draft.expected")}: </dt><dd className="inline" dir="auto">{draft.expected}</dd></div>}
                  {(shot || voice || video) && <div className="text-muted-foreground">{[shot && t("shotAdded"), voice && t("voiceAdded"), video && t("videoAdded")].filter(Boolean).join(" · ")}</div>}
                </dl>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={send} disabled={pending} className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50" data-testid="help-send">
                    {t("confirm")}
                  </button>
                  <button type="button" className={chip} onClick={restart} disabled={pending}>{t("edit")}</button>
                </div>
              </div>
            )}
            {step === "sent" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={chip} onClick={restart}>{t("again")}</button>
              </div>
            )}
            {pending && (
              <p className="flex w-fit gap-1 rounded-2xl rounded-ss-sm bg-muted px-3 py-3" data-testid="help-typing">
                <span className="sr-only">{t("typing")}</span>
                {[0, 150, 300].map((d) => (
                  <span key={d} aria-hidden className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" style={{ animationDelay: `${d}ms` }} />
                ))}
              </p>
            )}
            <div ref={end} />
          </div>
          {typing && (
            <form
              className="flex items-end gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                answer(text);
                setText("");
              }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    answer(text);
                    setText("");
                  }
                }}
                rows={1}
                maxLength={1500}
                dir="auto"
                placeholder={t("typeHere")}
                aria-label={t("typeHere")}
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm"
                data-testid="help-input"
              />
              <VoiceButton lang={locale === "ar" ? "ar" : "en-US"} value={text} onChange={setText} label={tm("dictate")} stopLabel={tm("dictateStop")} listeningLabel={tm("listening")} />
              {skippable && (
                <button type="button" className={chip} onClick={() => answer("")}>{t("skip")}</button>
              )}
              <button type="submit" disabled={pending} aria-label={t("send")} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-50" data-testid="help-submit">
                <Send className="size-4 rtl:-scale-x-100" />
              </button>
            </form>
          )}
          <footer className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            {ai && <p className="mb-1">{t("ai")}</p>}
            <Link href={`/support?from=${encodeURIComponent(path)}#support-form`} className="inline-flex items-center gap-1 font-medium text-primary underline" onClick={() => setOpen(false)} data-testid="help-email-switch">
              <Mail className="size-3.5" aria-hidden /> {t("fullForm")}
            </Link>
          </footer>
        </section>
      )}
    </>
  );
}
