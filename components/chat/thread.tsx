"use client";

import { Check, CheckCheck, Loader2, SendHorizontal, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendChatMessageAction } from "@/app/[locale]/(main)/chat-actions";
import { Button } from "@/components/ui/button";
import { MESSAGE_MAX, pollDelay, type ChatMessage, type ChatSide } from "@/lib/chat";
import { cn } from "@/lib/utils";

type Pending = { tempId: string; body: string; state: "sending" | "failed"; error?: string };

export type ThreadProps = {
  conversationId: string;
  side: ChatSide;
  /** The request's private link token, when the client came through it. */
  token?: string;
  initialMessages: ChatMessage[];
  initialOtherLastReadId: number;
  hasEarlier: boolean;
  closed?: boolean;
  className?: string;
};

const byId = (a: ChatMessage, b: ChatMessage) => a.id - b.id;

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  if (!incoming.length) return current;
  const map = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(byId);
}

/**
 * A two-person chat thread (adapted from TeamManager's ChatThreadView): own
 * messages on the logical end, "seen" ticks from the other side's read cursor,
 * optimistic sending reconciled by id, and polling that slows down when idle
 * and stops while the tab is hidden.
 */
export function ChatThread({ conversationId, side, token, initialMessages, initialOtherLastReadId, hasEarlier: initialHasEarlier, closed = false, className }: ThreadProps) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const [messages, setMessages] = useState(initialMessages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [otherRead, setOtherRead] = useState(initialOtherLastReadId);
  const [hasEarlier, setHasEarlier] = useState(initialHasEarlier);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastActivity = useRef(0);
  const lastId = useRef(initialMessages.at(-1)?.id ?? 0);

  useEffect(() => {
    lastId.current = messages.at(-1)?.id ?? 0;
  }, [messages]);

  const query = useCallback(
    (params: Record<string, string | number>) => {
      const search = new URLSearchParams({ as: side, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
      if (token) search.set("access", token);
      return `/api/conversations/${conversationId}/messages?${search}`;
    },
    [conversationId, side, token],
  );

  // Polling: every 3s while active, 15s then 30s when idle, paused while hidden.
  useEffect(() => {
    lastActivity.current = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const poll = async () => {
      if (stopped || document.hidden) return;
      try {
        const res = await fetch(query({ after: lastId.current }), { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { messages: ChatMessage[]; otherLastReadId: number };
          if (data.messages.length) {
            if (data.messages.some((m) => m.side !== side)) lastActivity.current = Date.now();
            setMessages((current) => merge(current, data.messages));
          }
          setOtherRead((current) => Math.max(current, data.otherLastReadId));
        }
      } catch {
        // offline: try again on the next tick
      }
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (stopped || document.hidden) return;
      timer = setTimeout(poll, pollDelay(Date.now() - lastActivity.current));
    };
    const onVisibility = () => {
      if (document.hidden) clearTimeout(timer);
      else {
        lastActivity.current = Date.now();
        void poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [query, side]);

  // Keep the newest message in view unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending.length]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const deliver = async (item: Pending) => {
    setPending((list) => list.map((p) => (p.tempId === item.tempId ? { ...p, state: "sending", error: undefined } : p)));
    const result = await sendChatMessageAction({ conversationId, side, body: item.body, token }).catch(() => ({ error: "generic" as const }));
    if ("message" in result) {
      setPending((list) => list.filter((p) => p.tempId !== item.tempId));
      setMessages((current) => merge(current, [result.message]));
    } else {
      setPending((list) => list.map((p) => (p.tempId === item.tempId ? { ...p, state: "failed", error: result.error } : p)));
    }
  };

  const send = () => {
    const body = draft.trim();
    if (!body || body.length > MESSAGE_MAX || closed) return;
    lastActivity.current = Date.now();
    stickToBottom.current = true;
    const item: Pending = { tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`, body, state: "sending" };
    setPending((list) => [...list, item]);
    setDraft("");
    void deliver(item);
  };

  const loadEarlier = async () => {
    const first = messages[0]?.id;
    if (!first) return;
    setLoadingEarlier(true);
    stickToBottom.current = false;
    try {
      const res = await fetch(query({ before: first }), { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { messages: ChatMessage[] };
        setMessages((current) => merge(current, data.messages));
        setHasEarlier(data.messages.length >= 50);
      }
    } finally {
      setLoadingEarlier(false);
    }
  };

  const time = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { hour: "numeric", minute: "2-digit" });
  const day = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { day: "numeric", month: "short" });
  const stamp = (iso: string) => {
    const d = new Date(iso);
    return new Date().toDateString() === d.toDateString() ? time.format(d) : `${day.format(d)} · ${time.format(d)}`;
  };
  const lastOwn = [...messages].reverse().find((m) => m.side === side)?.id;
  const failedError = pending.find((p) => p.state === "failed")?.error;

  return (
    <section className={cn("flex h-[calc(100dvh-14rem)] min-h-[24rem] flex-col overflow-hidden rounded-2xl border bg-background md:h-[calc(100dvh-12rem)]", className)} data-testid="chat-thread">
      <div className="flex shrink-0 items-start gap-2 border-b bg-muted/60 px-3 py-2 text-xs text-muted-foreground" role="note" data-testid="chat-notice">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <p>
          <span className="font-semibold text-foreground">{t("noticeTitle")}.</span> {t("notice")}
        </p>
      </div>

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3" aria-live="polite" data-testid="chat-messages">
        {hasEarlier && (
          <div className="flex justify-center pb-2">
            <Button size="sm" variant="ghost" onClick={loadEarlier} disabled={loadingEarlier}>
              {loadingEarlier && <Loader2 className="size-3.5 animate-spin" />}
              {t("loadEarlier")}
            </Button>
          </div>
        )}
        {!messages.length && !pending.length && <p className="py-10 text-center text-sm text-muted-foreground">{side === "client" ? t("emptyClient") : t("emptyAgency")}</p>}
        {messages.map((m) => {
          const mine = m.side === side;
          const seen = mine && m.id <= otherRead;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")} data-testid="chat-message" data-side={m.side}>
              <div className={cn("max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-xs", mine ? "rounded-ee-md bg-primary text-primary-foreground" : "rounded-es-md bg-muted text-foreground", m.hidden && "italic opacity-70")}>
                {m.side !== "client" && m.side !== "agency" && <p className="mb-0.5 text-[11px] font-semibold">{t(`sides.${m.side}`)}</p>}
                <p className="break-words whitespace-pre-wrap" dir="auto">
                  {m.hidden ? t("hidden") : m.body}
                </p>
                <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-75")}>
                  <time dateTime={m.createdAt} suppressHydrationWarning>
                    {stamp(m.createdAt)}
                  </time>
                  {mine &&
                    (seen ? (
                      <CheckCheck className="size-3.5" aria-label={t("seen")} data-testid={m.id === lastOwn ? "chat-seen" : undefined} />
                    ) : (
                      <Check className="size-3.5" aria-label={t("sent")} />
                    ))}
                </p>
              </div>
            </div>
          );
        })}
        {pending.map((p) => (
          <div key={p.tempId} className="flex justify-end" data-testid="chat-pending">
            <div className={cn("max-w-[82%] rounded-2xl rounded-ee-md px-3 py-2 text-sm", p.state === "failed" ? "border border-destructive bg-destructive/10" : "bg-primary/70 text-primary-foreground")}>
              <p className="break-words whitespace-pre-wrap" dir="auto">
                {p.body}
              </p>
              <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-80">
                {p.state === "sending" ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> {t("sending")}
                  </>
                ) : (
                  <button type="button" className="font-semibold underline" onClick={() => deliver(p)}>
                    {t("failed")} · {t("retry")}
                  </button>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {failedError && <p className="px-1 pb-1 text-xs text-destructive" role="alert">{t(`errors.${failedError as "generic"}`)}</p>}
        {closed ? (
          <p className="py-2 text-center text-sm text-muted-foreground">{t("closed")}</p>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                lastActivity.current = Date.now();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={MESSAGE_MAX}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              dir="auto"
              className="field-sizing-content max-h-36 min-h-10 flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              data-testid="message-input"
            />
            <Button type="submit" size="icon-lg" className="rounded-full" disabled={!draft.trim()} aria-label={t("send")} data-testid="message-send">
              <SendHorizontal className="size-4 rtl:-scale-x-100" />
            </Button>
          </form>
        )}
        <p className="flex justify-between gap-2 px-1 pt-1 text-[11px] text-muted-foreground">
          <span>{t("noticeShort")}</span>
          {draft.length > MESSAGE_MAX - 200 && <span dir="ltr">{t("counter", { count: draft.length, max: MESSAGE_MAX })}</span>}
        </p>
      </div>
    </section>
  );
}
