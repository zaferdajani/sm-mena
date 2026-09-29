"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { captionStructure, PORTFOLIO_EXAMPLES, type PortfolioExample } from "@/lib/creator/setup";
import "./creator-guide.css";

const control = "inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const steps = ["images", "caption", "client", "services"] as const;
type Step = (typeof steps)[number];

export function CreatorSetupNudge({ hasWork }: { hasWork: boolean }) {
  const t = useTranslations("CreatorSetup");
  const path = usePathname();
  if (hasWork || (path !== "/studio" && path !== "/studio/profile")) return null;
  return (
    <aside className="mb-5 space-y-2 rounded-2xl border border-brand-line bg-brand-soft p-4" data-testid="creator-setup-nudge">
      <h2 className="font-semibold">{t("nudgeTitle")}</h2>
      <p className="text-sm leading-7">{t("nudgeBody")}</p>
      <Link href="/setup" className={`${control} bg-background text-brand`} data-testid="creator-setup-start">{t("startSetup")}</Link>
      <Link href="/studio/setup" className={`${control} bg-background text-brand`}>{t("openGuide")}</Link>
    </aside>
  );
}

export function PortfolioConcept() {
  const t = useTranslations("CreatorSetup");
  return (
    <section className="space-y-3" data-testid="portfolio-concept">
      <h2 className="font-semibold">{t("mapTitle")}</h2>
      <ol className="grid gap-3 sm:grid-cols-2">
        {(["profile", "client", "project", "images"] as const).map((key, index) => (
          <li key={key} className="min-w-0 space-y-2 rounded-2xl border bg-card p-4">
            <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">{index + 1}</span>
            <h3 className="font-semibold">{t(`map.${key}.title`)}</h3>
            <p className="text-sm leading-7 text-muted-foreground">{t(`map.${key}.body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PortfolioExamples() {
  const t = useTranslations("CreatorSetup");
  const [selected, setSelected] = useState<PortfolioExample>("social");
  const id = useId();
  return (
    <details className="rounded-2xl border bg-card p-4" data-testid="portfolio-examples">
      <summary className="cursor-pointer py-2 font-semibold">{t("examplesTitle")}</summary>
      <p className="my-3 text-sm leading-7 text-muted-foreground">{t("examplesNote")}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("examplesTitle")}>
        {PORTFOLIO_EXAMPLES.map((key) => (
          <button type="button" key={key} aria-pressed={selected === key} aria-controls={id}
            onClick={() => setSelected(key)} data-testid={`portfolio-example-${key}`}
            className={`${control} ${selected === key ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
            {t(`examples.${key}.label`)}
          </button>
        ))}
      </div>
      <div id={id} className="mt-4 space-y-3 rounded-xl border bg-muted/30 p-4" data-testid="portfolio-example-preview" aria-live="polite">
        <div className="grid grid-cols-3 gap-2" aria-hidden="true">
          {[1, 2, 3].map((n) => <div key={n} className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-background text-xl font-bold text-muted-foreground">{n}</div>)}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {([['client', 'clientLabel'], ['project', 'projectLabel'], ['role', 'roleLabel'], ['media', 'mediaLabel']] as const).map(([key, label]) => (
            <div key={key} className="min-w-0 space-y-1">
              <dt className="text-xs font-semibold text-muted-foreground">{t(label)}</dt>
              <dd className="text-sm leading-7">{t(`examples.${selected}.${key}`)}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t pt-3 text-sm leading-7">{t(`examples.${selected}.caption`)}</p>
      </div>
    </details>
  );
}

/** Optional guide alongside the real form. Never uploads, publishes or changes a client. */
export function PortfolioComposerGuide({ descriptionOutline }: { descriptionOutline: string }) {
  const t = useTranslations("CreatorSetup");
  const [step, setStep] = useState<Step | null>(null);
  const [message, setMessage] = useState<"structureAdded" | "structurePreserved" | "formMissing" | null>(null);
  const activeButton = useRef<HTMLButtonElement | null>(null);
  const hintId = useId();
  useEffect(() => {
    if (!step) return;
    const form = document.querySelector<HTMLFormElement>('[data-testid="post-form"]');
    if (!form) return;
    const selectors: Record<Step, string> = { images: '[data-testid="image-input"]', caption: '#caption', client: '#clientId', services: 'input[name="services"]' };
    const field = form.querySelector<HTMLElement>(selectors[step]);
    if (!field) return;
    // Field and ChipGroup structures are stable in components/studio/chips.tsx.
    const target = step === "images" ? field.parentElement : step === "services" ? field.parentElement?.parentElement : field;
    if (!target) return;
    const tabindex = target.getAttribute("tabindex");
    const describedBy = target.getAttribute("aria-describedby");
    target.classList.add("creator-field-highlight");
    target.setAttribute("data-creator-highlight", step);
    target.setAttribute("aria-describedby", [describedBy, hintId].filter(Boolean).join(" "));
    if (step === "images" || step === "services") target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setStep(null); activeButton.current?.focus(); }
    };
    window.addEventListener("keydown", escape);
    return () => {
      target.classList.remove("creator-field-highlight");
      target.removeAttribute("data-creator-highlight");
      if (tabindex === null) target.removeAttribute("tabindex"); else target.setAttribute("tabindex", tabindex);
      if (describedBy === null) target.removeAttribute("aria-describedby"); else target.setAttribute("aria-describedby", describedBy);
      window.removeEventListener("keydown", escape);
    };
  }, [step, hintId]);

  function applyOutline() {
    const input = document.querySelector<HTMLTextAreaElement>('[data-testid="post-form"] #caption');
    if (!input) { setMessage("formMissing"); return; }
    const next = captionStructure(input.value, descriptionOutline);
    if (next === null) { setMessage("structurePreserved"); return; }
    // The existing caption is an uncontrolled native field; preserve its form contract.
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(input, next); else input.value = next;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setMessage("structureAdded");
    setStep("caption");
  }

  return (
    <aside className="mb-5 space-y-4 rounded-2xl border border-brand-line bg-brand-soft p-4" data-testid="portfolio-composer-guide">
      <div className="space-y-2">
        <h2 className="font-semibold">{t("postTitle")}</h2>
        <p className="text-sm leading-7">{t("postBody")}</p>
      </div>
      <PortfolioExamples />
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("tourTitle")}</h3>
        <div className="flex flex-wrap gap-2">
          {steps.map((key) => (
            <button key={key} type="button" aria-pressed={step === key} data-testid={`creator-step-${key}`}
              className={`${control} bg-background ${step === key ? "border-primary text-brand" : ""}`}
              onClick={(event) => { activeButton.current = event.currentTarget; setStep(key); }}>
              {t(`steps.${key}`)}
            </button>
          ))}
        </div>
        <p id={hintId} role="status" className="text-sm leading-7">{step ? t(`focus.${step}`) : ""}</p>
        {step && <button type="button" className={control} onClick={() => { setStep(null); activeButton.current?.focus(); }}>{t("stopHighlight")}</button>}
      </div>
      <button type="button" className={`${control} bg-background`} onClick={applyOutline} data-testid="creator-use-structure">{t("useStructure")}</button>
      {message && <p role="status" className="text-sm leading-7" data-testid="creator-template-status">{t(message)}</p>}
      <Link href="/studio/setup" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand underline underline-offset-4">{t("nav")}</Link>
    </aside>
  );
}

export function PortfolioClientGuide() {
  const t = useTranslations("CreatorSetup");
  return (
    <aside className="space-y-2 rounded-2xl border border-brand-line bg-brand-soft p-4" data-testid="portfolio-client-guide">
      <h2 className="font-semibold">{t("clientTitle")}</h2>
      <p className="text-sm leading-7">{t("clientBody")}</p>
      <Link href="/setup" className={`${control} bg-background text-brand`} data-testid="creator-setup-start">{t("startSetup")}</Link>
      <Link href="/studio/setup" className={`${control} bg-background text-brand`}>{t("openGuide")}</Link>
    </aside>
  );
}
