"use client";

import { RotateCcw, SendHorizontal, Sparkles, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { RequestForm } from "@/components/requests/request-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MatchResponse, Recommendation } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { RecommendationCard } from "./recommendation-card";

type Turn = { role: "user" | "assistant"; content: string; recommendation?: Recommendation | null; suggestions?: string[]; mode?: "ai" | "basic" };
type Option = { key: string; label: string };

const STORAGE_KEY = "sawwiq-match-chat";

export function MatchChat({ services, cities, starters }: { services: Option[]; cities: Option[]; starters: string[] }) {
  const t = useTranslations("Match");
  const locale = useLocale();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestFor, setRequestFor] = useState<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  // Restore the conversation after hydration (server render is always empty).
  useEffect(() => {
    let saved: Turn[] | null = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      saved = raw ? (JSON.parse(raw) as Turn[]) : null;
    } catch {}
    if (!saved?.length) return;
    const id = setTimeout(() => setTurns(saved), 0);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-30)));
    } catch {}
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    const next: Turn[] = [...turns, { role: "user", content }];
    setTurns(next);
    setInput("");
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages: next.slice(-20).map(({ role, content }) => ({ role, content })) }),
      });
      if (res.status === 429) throw new Error("rateLimited");
      if (!res.ok) throw new Error("error");
      const data = (await res.json()) as MatchResponse;
      setTurns([...next, { role: "assistant", content: data.reply, recommendation: data.recommendation, suggestions: data.suggestions, mode: data.mode }]);
    } catch (e) {
      setError(e instanceof Error && e.message === "rateLimited" ? t("rateLimited") : t("error"));
      setTurns(turns);
      setInput(content);
    } finally {
      setPending(false);
    }
  };

  const lastAssistant = [...turns].reverse().find((x) => x.role === "assistant");

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex-1 space-y-4 px-3 py-4" data-testid="chat-log">
        <Bubble role="assistant">{t("intro")}</Bubble>
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-start text-sm hover:bg-muted" data-testid="starter">
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            {turn.content && <Bubble role={turn.role}>{turn.content}</Bubble>}
            {turn.recommendation && (
              <div className="space-y-3" data-testid="recommendation">
                {(turn.recommendation.budgetMinJod !== null || turn.recommendation.budgetMaxJod !== null) && (
                  <div className="flex items-start gap-3 rounded-xl border bg-brand-soft p-3" data-testid="budget-card">
                    <Wallet className="mt-0.5 size-5 text-brand" />
                    <div className="text-sm">
                      <p className="font-semibold">
                        {t("budget")}:{" "}
                        <span dir="ltr">
                          {turn.recommendation.budgetMinJod ?? "?"}–{turn.recommendation.budgetMaxJod ?? "?"}
                        </span>{" "}
                        {t("perMonth")}
                      </p>
                      {turn.recommendation.budgetNote && <p className="text-muted-foreground" dir="auto">{turn.recommendation.budgetNote}</p>}
                    </div>
                  </div>
                )}
                {turn.recommendation.agencies.map((agency, rank) => (
                  <RecommendationCard key={agency.id} agency={agency} rank={rank + 1} />
                ))}
                {requestFor === i ? (
                  <div className="rounded-xl border p-3">
                    <RequestForm
                      source="ai"
                      services={services}
                      cities={cities}
                      defaults={{
                        services: turn.recommendation.services,
                        platforms: turn.recommendation.platforms,
                        city: turn.recommendation.city,
                        budgetMin: turn.recommendation.budgetMinJod,
                        budgetMax: turn.recommendation.budgetMaxJod,
                        description: turn.recommendation.summary,
                      }}
                    />
                  </div>
                ) : (
                  <Button className="h-11 w-full gap-2" onClick={() => setRequestFor(i)} data-testid="send-project">
                    <Sparkles className="size-4" />
                    {t("sendProject")}
                  </Button>
                )}
              </div>
            )}
            {turn.mode === "basic" && turn === lastAssistant && <p className="text-[11px] text-muted-foreground">{t("basicMode")}</p>}
          </div>
        ))}
        {pending && <Bubble role="assistant"><span className="animate-pulse">{t("thinking")}</span></Bubble>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!pending && lastAssistant?.suggestions && lastAssistant.suggestions.length > 0 && turns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lastAssistant.suggestions.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-16 flex items-end gap-2 border-t bg-background/95 p-3 backdrop-blur md:bottom-0"
      >
        {turns.length > 0 && (
          <Button type="button" variant="ghost" className="size-10 shrink-0 px-0" aria-label={t("startOver")} onClick={() => { setTurns([]); setRequestFor(null); }}>
            <RotateCcw className="size-4" />
          </Button>
        )}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="max-h-32 min-h-10 flex-1 resize-none"
          data-testid="chat-input"
        />
        <Button type="submit" className="size-10 shrink-0 px-0" disabled={pending || !input.trim()} aria-label={t("send")} data-testid="chat-send">
          <SendHorizontal className="size-4 rtl:-scale-x-100" />
        </Button>
      </form>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        dir="auto"
        className={cn(
          "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm",
          role === "user" ? "rounded-ee-sm bg-primary text-primary-foreground" : "rounded-es-sm bg-muted",
        )}
        data-testid={role === "assistant" ? "assistant-message" : "user-message"}
      >
        {children}
      </div>
    </div>
  );
}
