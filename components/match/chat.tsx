"use client";

import { RotateCcw, SendHorizontal, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { RequestForm } from "@/components/requests/request-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MatchResponse, Recommendation } from "@/lib/ai/types";
import { countryOf, isCountryCode, type CountryCode } from "@/lib/countries";
import {
  answer,
  emptyNeed,
  exampleBudget,
  formatAmount,
  forNewCountry,
  nextStep,
  reopen,
  skipRest,
  speechLang,
  type Answer,
  type PriceStats,
  type Step,
  type WizardNeed,
} from "@/lib/match-wizard";
import { cn } from "@/lib/utils";
import { RecommendationCard } from "./recommendation-card";
import { VoiceButton } from "./voice-button";
import { Chip, useRangeLabel, WizardChips, type ChipStep, type ResultAction } from "./wizard-chips";

const QUESTION_STEPS: readonly string[] = ["groups", "services", "industry", "platforms", "budget", "city", "country"];
const isQuestionStep = (s: unknown): s is Step => typeof s === "string" && QUESTION_STEPS.includes(s);

type Turn = {
  role: "user" | "assistant";
  content: string;
  recommendation?: Recommendation | null;
  suggestions?: string[];
  mode?: "ai" | "basic";
  provider?: string;
  /** Choices this assistant turn offers (shown while it is the latest turn). */
  step?: ChipStep;
  switchTo?: { country: string; city: string | null };
};
type Option = { key: string; label: string };
type Saved = { turns: Turn[]; need: WizardNeed; country: string };

const STORAGE_KEY = "sawwiq-match-wizard";
const COUNTRY_COOKIE = "sw_country";

/**
 * The matchmaker chat. It guides with one question at a time and tappable
 * choices (lib/match-wizard.ts); typed or dictated text works at every step and
 * goes to /api/match with the answers so far. With an AI provider configured,
 * only the first question is guided and the model takes the conversation from there.
 */
export function MatchChat({
  services,
  cities,
  platforms,
  country: serverCountry,
  priceStats,
  aiMode,
  canRequest = true,
}: {
  services: Option[];
  cities: Option[];
  platforms: Option[];
  country: CountryCode;
  priceStats: Record<string, PriceStats>;
  /** Quote requests are available (Admin → Features); otherwise no "send my project" step. */
  canRequest?: boolean;
  aiMode: boolean;
}) {
  const t = useTranslations("Match");
  const tw = useTranslations("MatchWizard");
  const tCountry = useTranslations("Countries");
  const tCity = useTranslations("Cities");
  const locale = useLocale();
  const router = useRouter();
  const rangeLabel = useRangeLabel();
  // A country picked in the chat applies at once; the server catches up on refresh.
  const [override, setOverride] = useState<CountryCode | null>(null);
  const country = override ?? serverCountry;
  const currency = countryOf(country).currency;
  const question = (s: Step, c: CountryCode = country): Turn => ({ role: "assistant", content: tw(`questions.${s}`, { country: tCountry(c) }), step: s });

  const [turns, setTurns] = useState<Turn[]>(() => [question("groups")]);
  const [need, setNeed] = useState<WizardNeed>(emptyNeed);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestFor, setRequestFor] = useState<number | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const thinking = useRef<HTMLDivElement>(null);
  const shown = useRef(1);

  // The header's country picker changed the country: a budget in the old
  // currency and a city there no longer apply.
  const [seenCountry, setSeenCountry] = useState(serverCountry);
  if (seenCountry !== serverCountry) {
    setSeenCountry(serverCountry);
    if (override === serverCountry) setOverride(null);
    else if (!override) setNeed((n) => forNewCountry(n));
  }

  // Restore the conversation after hydration (server render is always the first question).
  useEffect(() => {
    let saved: Saved | null = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      saved = raw ? (JSON.parse(raw) as Saved) : null;
    } catch {}
    if (!saved?.turns?.length || !saved.need) return;
    const restored = saved;
    // Wizard questions are re-worded in the current language (the visitor may
    // have switched language since); what the visitor typed or tapped stays.
    const id = setTimeout(() => {
      setTurns(restored.turns.map((x) => (x.role === "assistant" && !x.mode && isQuestionStep(x.step) ? { ...x, content: question(x.step).content } : x)));
      setNeed(restored.country === serverCountry ? restored.need : forNewCountry(restored.need));
    }, 0);
    return () => clearTimeout(id);
    // Runs once after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ turns: turns.slice(-30), need, country } satisfies Saved));
    } catch {}
  }, [turns, need, country]);

  // Lead the visitor to what is new: while waiting, the "thinking" bubble; then
  // the first new assistant turn at the top of the screen, so the next question
  // and its options sit right under the header instead of below the fold.
  useEffect(() => {
    const before = shown.current;
    shown.current = turns.length;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (pending) return thinking.current?.scrollIntoView({ behavior, block: "nearest" });
    if (turns.length === before) return;
    // A restored conversation (many turns at once) opens at its latest question.
    const first =
      turns.length - before > 3
        ? turns.findLastIndex((x) => x.role === "assistant")
        : turns.findIndex((x, i) => i >= Math.min(before, turns.length - 1) && x.role === "assistant");
    if (first < 0) return;
    log.current?.querySelector(`[data-turn="${first}"]`)?.scrollIntoView({ behavior, block: "start" });
  }, [turns, pending]);

  const user = (content: string): Turn => ({ role: "user", content });

  /** Sends the conversation and the answers so far; adds the reply and the next question. */
  const call = async (base: Turn[], n: WizardNeed, picked: boolean, restore: { turns: Turn[]; need: WizardNeed; input?: string }) => {
    setTurns(base);
    setNeed(n);
    setError(null);
    setPending(true);
    try {
      const messages = base.filter((x) => x.content).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })).slice(-20);
      while (messages.length && messages[0].role !== "user") messages.shift();
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages, need: n, picked }),
      });
      if (res.status === 429) throw new Error("rateLimited");
      if (!res.ok) throw new Error("error");
      const data = (await res.json()) as MatchResponse;
      const after = data.need ?? n;
      const s = data.need ? nextStep(after) : null;
      const step: ChipStep | undefined = data.recommendation ? "results" : data.countrySwitch ? "switch" : s === "results" ? "results" : undefined;
      const out = [...base];
      if (data.reply || data.recommendation) {
        out.push({ role: "assistant", content: data.reply, recommendation: data.recommendation, suggestions: data.suggestions, mode: data.mode, provider: data.provider, step, switchTo: data.countrySwitch });
      }
      if (!data.recommendation && !data.countrySwitch && s && s !== "results") out.push(question(s));
      setNeed(after);
      setTurns(out);
    } catch (e) {
      setError(e instanceof Error && e.message === "rateLimited" ? t("rateLimited") : t("error"));
      setTurns(restore.turns);
      setNeed(restore.need);
      if (restore.input) setInput(restore.input);
    } finally {
      setPending(false);
    }
  };

  /** Asks the next question, or searches when everything needed is known. */
  const advance = (n: WizardNeed, base: Turn[], c: CountryCode = country) => {
    const s = aiMode ? "results" : nextStep(n);
    if (s !== "results") {
      setNeed(n);
      setTurns([...base, question(s, c)]);
      return;
    }
    void call(base, n, true, { turns, need });
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    setInput("");
    void call([...turns, user(content)], need, false, { turns, need, input: content });
  };

  const restart = () => {
    setTurns([question("groups")]);
    setNeed(emptyNeed());
    setRequestFor(null);
    setError(null);
  };

  const changeCountry = (code: CountryCode, label: string, city: string | null = null) => {
    document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOverride(code);
    router.refresh();
    const base = [...turns, user(label), { role: "assistant" as const, content: tw("questions.changedCountry", { country: tCountry(code) }) }];
    advance(forNewCountry(need, city), base, code);
  };

  const onAnswer = (a: Answer, label: string) => advance(answer(need, a), [...turns, user(label)]);
  const onShowNow = (label: string) => advance(skipRest(need), [...turns, user(label)]);
  const onSwitch = (yes: boolean, label: string) => {
    const to = turns.at(-1)?.switchTo;
    if (yes && to && isCountryCode(to.country)) changeCountry(to.country, label, to.city);
    else advance(need, [...turns, user(label)]);
  };
  const onResult = (action: ResultAction, label: string) => {
    if (action === "restart") return restart();
    if (action === "send") return setRequestFor(turns.findLastIndex((x) => x.recommendation?.agencies.length));
    advance(reopen(need, action), [...turns, user(label)]);
  };

  const last = turns.at(-1);
  const activeStep = !pending && last?.role === "assistant" ? last.step : undefined;
  const lastAssistant = [...turns].reverse().find((x) => x.role === "assistant" && x.mode);
  const started = turns.some((x) => x.role === "user");
  const placeholder = tw("placeholder", { city: tCity(countryOf(country).cities[0].key), budget: formatAmount(exampleBudget(currency), locale, currency) });

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div ref={log} className="flex-1 space-y-4 px-3 py-4" data-testid="chat-log">
        <Bubble role="assistant">{t("intro")}</Bubble>
        {turns.map((turn, i) => (
          <div key={i} className="scroll-mt-20 space-y-3" data-turn={i}>
            {turn.content && <Bubble role={turn.role}>{turn.content}</Bubble>}
            {turn.recommendation && (
              <div className="space-y-3" data-testid="recommendation">
                {(turn.recommendation.budgetMinJod !== null || turn.recommendation.budgetMaxJod !== null) && (
                  <div className="flex items-start gap-3 rounded-xl border bg-brand-soft p-3" data-testid="budget-card">
                    <Wallet className="mt-0.5 size-5 shrink-0 text-brand" />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold">
                        {tw("budget.suggested", {
                          range: tw("budget.perMonth", {
                            range: rangeLabel({ min: turn.recommendation.budgetMinJod, max: turn.recommendation.budgetMaxJod }, turn.recommendation.currency ?? currency),
                          }),
                        })}
                      </p>
                      {turn.recommendation.budgetNote && <p className="text-muted-foreground" dir="auto">{turn.recommendation.budgetNote}</p>}
                    </div>
                  </div>
                )}
                {turn.recommendation.agencies.map((agency, rank) => (
                  <RecommendationCard key={agency.id} agency={agency} rank={rank + 1} country={country} />
                ))}
                {requestFor === i && (
                  <div className="rounded-xl border p-3">
                    <RequestForm
                      source="ai"
                      services={services}
                      cities={cities}
                      platforms={platforms}
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
                )}
              </div>
            )}
            {turn === lastAssistant && (turn.mode === "basic" || turn.provider === "mock") && (
              <p className="text-[11px] text-muted-foreground">{t(turn.provider === "mock" ? "mockMode" : "basicMode")}</p>
            )}
          </div>
        ))}
        {pending && (
          <div ref={thinking} className="scroll-mb-40">
            <Bubble role="assistant">
              <span className="animate-pulse">{t("thinking")}</span>
            </Bubble>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {activeStep && (
          <WizardChips
            key={turns.length}
            step={activeStep}
            need={need}
            country={country}
            currency={currency}
            priceStats={priceStats}
            aiMode={aiMode}
            hasResults={Boolean(last?.recommendation?.agencies.length)}
            canRequest={canRequest}
            switchTo={last?.switchTo && isCountryCode(last.switchTo.country) ? last.switchTo.country : undefined}
            onAnswer={onAnswer}
            onShowNow={onShowNow}
            onCountry={(code, label) => changeCountry(code, label)}
            onSwitch={onSwitch}
            onResult={onResult}
          />
        )}
        {!pending && !activeStep && last?.role === "assistant" && last.suggestions && last.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {last.suggestions.map((s) => (
              <Chip key={s} onClick={() => send(s)}>
                {s}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-16 flex items-end gap-2 border-t bg-background/95 p-3 backdrop-blur md:bottom-0"
      >
        {started && (
          <Button type="button" variant="ghost" className="size-10 shrink-0 px-0" aria-label={t("startOver")} onClick={restart}>
            <RotateCcw className="size-4" />
          </Button>
        )}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-32 min-h-10 flex-1 resize-none"
          data-testid="chat-input"
        />
        <VoiceButton lang={speechLang(locale, country)} value={input} onChange={setInput} label={tw("mic")} stopLabel={tw("micStop")} listeningLabel={tw("listening")} />
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
          "max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-sm",
          role === "user" ? "rounded-ee-sm bg-primary text-primary-foreground" : "rounded-es-sm bg-muted",
        )}
        data-testid={role === "assistant" ? "assistant-message" : "user-message"}
      >
        {children}
      </div>
    </div>
  );
}
