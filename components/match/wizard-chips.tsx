"use client";

import { Check, Globe, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { citiesOf, COUNTRIES, type CountryCode } from "@/lib/countries";
import { INDUSTRIES, serviceLabel } from "@/lib/labels";
import {
  budgetRanges,
  formatAmount,
  GROUPS,
  groupOfService,
  MAIN_CITIES,
  PLATFORM_CHOICES,
  servicesOfGroup,
  type Answer,
  type BudgetRange,
  type PriceStats,
  type Step,
  type WizardNeed,
} from "@/lib/match-wizard";
import { cn } from "@/lib/utils";

export type ResultAction = "send" | "budget" | "city" | "restart";
export type ChipStep = Step | "results" | "switch";

export function Chip({ pressed, onClick, disabled, primary, children, testId }: { pressed?: boolean; onClick: () => void; disabled?: boolean; primary?: boolean; children: React.ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      data-testid={testId}
      className={cn(
        "inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border px-3 py-1.5 text-start text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        primary ? "border-primary bg-primary text-primary-foreground hover:bg-primary/85" : pressed ? "border-primary bg-primary/10 text-foreground" : "bg-background hover:bg-muted",
      )}
    >
      {pressed && <Check className="size-3.5 shrink-0" aria-hidden />}
      <span className="min-w-0 break-words">{children}</span>
    </button>
  );
}

/** Stats of the chosen group with the highest median (a multi-service project costs more). */
function statsFor(need: WizardNeed, stats: Record<string, PriceStats>): PriceStats {
  const groups = need.groups.length ? need.groups : need.services.map(groupOfService).filter((g): g is string => g !== null);
  return groups.map((g) => stats[g] ?? null).filter((s): s is NonNullable<PriceStats> => s !== null).sort((a, b) => b.median - a.median)[0] ?? null;
}

export function useRangeLabel() {
  const tw = useTranslations("MatchWizard");
  const locale = useLocale();
  return (r: BudgetRange, currency: string) => {
    const f = (n: number) => formatAmount(n, locale, currency);
    if (r.min === null && r.max !== null) return tw("budget.under", { max: f(r.max) });
    if (r.max === null && r.min !== null) return tw("budget.over", { min: f(r.min) });
    return tw("budget.between", { min: f(r.min ?? 0), max: f(r.max ?? 0) });
  };
}

/**
 * The tappable choices under the latest assistant question. Multi-select steps
 * collect picks (aria-pressed) and commit with "Next"; single-choice steps
 * commit on tap. `onAnswer` gets the answer and the text for the user's bubble.
 */
export function WizardChips({
  step,
  need,
  country,
  currency,
  priceStats,
  aiMode,
  hasResults,
  canRequest = true,
  switchTo,
  onAnswer,
  onShowNow,
  onCountry,
  onSwitch,
  onResult,
}: {
  step: ChipStep;
  need: WizardNeed;
  country: CountryCode;
  currency: string;
  priceStats: Record<string, PriceStats>;
  aiMode: boolean;
  hasResults: boolean;
  /** Quote requests are available (Admin → Features). */
  canRequest?: boolean;
  /** For "switch": the other country the message named. */
  switchTo?: CountryCode;
  onAnswer: (answer: Answer, label: string) => void;
  onShowNow: (label: string) => void;
  onCountry: (code: CountryCode, label: string) => void;
  onSwitch: (yes: boolean, label: string) => void;
  onResult: (action: ResultAction, label: string) => void;
}) {
  const tw = useTranslations("MatchWizard");
  const tInd = useTranslations("Industries");
  const tPlat = useTranslations("Platforms");
  const tCity = useTranslations("Cities");
  const tCountry = useTranslations("Countries");
  const locale = useLocale();
  const rangeLabel = useRangeLabel();
  const [picked, setPicked] = useState<string[]>([]);
  const [moreCities, setMoreCities] = useState(false);
  const [countries, setCountries] = useState(false);
  const sep = locale === "ar" ? "، " : ", ";
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const countryLabel = tCountry(country);
  const showNow =
    !aiMode && step !== "groups" && step !== "services" && step !== "results" && step !== "switch" && (need.groups.length > 0 || need.services.length > 0);

  let body: React.ReactNode = null;
  if (step === "groups") {
    body = (
      <>
        {GROUPS.map((g) => (
          <Chip key={g} pressed={picked.includes(g)} onClick={() => toggle(g)} testId={`choice-group-${g}`}>
            {tw(`groups.${g}` as "groups.social_media")}
          </Chip>
        ))}
        <Chip primary disabled={!picked.length} onClick={() => onAnswer({ step: "groups", groups: picked }, picked.map((g) => tw(`groups.${g}` as "groups.social_media")).join(sep))} testId="choice-next">
          {tw("chips.next")}
        </Chip>
      </>
    );
  } else if (step === "services") {
    const options = need.groups.flatMap(servicesOfGroup);
    body = (
      <>
        <Chip onClick={() => onAnswer({ step: "services", services: [] }, tw("chips.any"))} testId="choice-any">
          {tw("chips.any")}
        </Chip>
        {options.map((s) => (
          <Chip key={s} pressed={picked.includes(s)} onClick={() => toggle(s)} testId={`choice-service-${s}`}>
            {serviceLabel(s, locale)}
          </Chip>
        ))}
        <Chip primary disabled={!picked.length} onClick={() => onAnswer({ step: "services", services: picked }, picked.map((s) => serviceLabel(s, locale)).join(sep))} testId="choice-next">
          {tw("chips.next")}
        </Chip>
      </>
    );
  } else if (step === "industry") {
    body = INDUSTRIES.map((k) => (
      <Chip key={k} onClick={() => onAnswer({ step: "industry", industry: k }, tInd(k))} testId={`choice-industry-${k}`}>
        {tInd(k)}
      </Chip>
    ));
  } else if (step === "platforms") {
    body = (
      <>
        {PLATFORM_CHOICES.map((p) => (
          <Chip key={p} pressed={picked.includes(p)} onClick={() => toggle(p)} testId={`choice-platform-${p}`}>
            {tPlat(p as "instagram")}
          </Chip>
        ))}
        <Chip onClick={() => onAnswer({ step: "platforms", platforms: [] }, tw("chips.notSure"))} testId="choice-not-sure">
          {tw("chips.notSure")}
        </Chip>
        <Chip primary disabled={!picked.length} onClick={() => onAnswer({ step: "platforms", platforms: picked }, picked.map((p) => tPlat(p as "instagram")).join(sep))} testId="choice-next">
          {tw("chips.next")}
        </Chip>
      </>
    );
  } else if (step === "budget") {
    const ranges = budgetRanges(currency, statsFor(need, priceStats));
    body = (
      <>
        {ranges.map((r, i) => {
          const label = rangeLabel(r, currency);
          return (
            <Chip key={i} onClick={() => onAnswer({ step: "budget", min: r.min, max: r.max }, tw("budget.perMonth", { range: label }))} testId={`choice-budget-${i}`}>
              <bdi>{label}</bdi>
            </Chip>
          );
        })}
        <Chip onClick={() => onAnswer({ step: "budget", min: null, max: null }, tw("chips.notSure"))} testId="choice-not-sure">
          {tw("chips.notSure")}
        </Chip>
      </>
    );
  } else if (step === "city") {
    const cities = citiesOf(country);
    const shown = moreCities ? cities : cities.slice(0, MAIN_CITIES);
    body = countries ? (
      COUNTRIES.filter((c) => c.code !== country).map((c) => (
        <Chip key={c.code} onClick={() => onCountry(c.code, `${c.flag} ${tCountry(c.code)}`)} testId={`choice-country-${c.code}`}>
          <span aria-hidden>{c.flag}</span> {tCountry(c.code)}
        </Chip>
      ))
    ) : (
      <>
        <Chip onClick={() => onAnswer({ step: "city", city: null }, tw("chips.allCountry", { country: countryLabel }))} testId="choice-all-country">
          {tw("chips.allCountry", { country: countryLabel })}
        </Chip>
        {shown.map((c) => (
          <Chip key={c.key} onClick={() => onAnswer({ step: "city", city: c.key }, tCity(c.key))} testId={`choice-city-${c.key}`}>
            {tCity(c.key)}
          </Chip>
        ))}
        {!moreCities && cities.length > MAIN_CITIES && (
          <Chip onClick={() => setMoreCities(true)} testId="choice-more-cities">
            {tw("chips.moreCities")}
          </Chip>
        )}
        <button
          type="button"
          onClick={() => setCountries(true)}
          className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          data-testid="choice-change-country"
        >
          <Globe className="size-3.5" aria-hidden />
          {tw("chips.changeCountry")}
        </button>
      </>
    );
  } else if (step === "switch" && switchTo) {
    const other = tCountry(switchTo);
    body = (
      <>
        <Chip primary onClick={() => onSwitch(true, tw("chips.switchYes", { country: other }))} testId="choice-switch-yes">
          {tw("chips.switchYes", { country: other })}
        </Chip>
        <Chip onClick={() => onSwitch(false, tw("chips.switchNo", { country: countryLabel }))} testId="choice-switch-no">
          {tw("chips.switchNo", { country: countryLabel })}
        </Chip>
      </>
    );
  } else if (step === "results") {
    body = (
      <>
        {hasResults && canRequest && (
          <Chip primary onClick={() => onResult("send", tw("chips.sendProject"))} testId="send-project">
            <Sparkles className="me-1 inline size-3.5" aria-hidden />
            {tw("chips.sendProject")}
          </Chip>
        )}
        {!aiMode && (
          <>
            <Chip onClick={() => onResult("budget", tw("chips.changeBudget"))} testId="choice-change-budget">
              {tw("chips.changeBudget")}
            </Chip>
            <Chip onClick={() => onResult("city", tw("chips.changeCity"))} testId="choice-change-city">
              {tw("chips.changeCity")}
            </Chip>
          </>
        )}
        <Chip onClick={() => onResult("restart", tw("chips.startOver"))} testId="choice-start-over">
          {tw("chips.startOver")}
        </Chip>
      </>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" data-testid="wizard-choices" data-step={step}>
      {body}
      {showNow && (
        <Chip onClick={() => onShowNow(tw("chips.showNow"))} testId="choice-show-now">
          {tw("chips.showNow")}
        </Chip>
      )}
    </div>
  );
}
