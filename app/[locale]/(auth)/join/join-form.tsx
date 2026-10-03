"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CountryCityField, type CountryOption } from "@/components/country-city-field";
import { PhoneField } from "@/components/forms/phone-field";
import { FormError } from "@/components/form-error";
import { ServicePicker } from "@/components/service-picker";
import { TeamFields } from "@/components/studio/team-fields";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { join } from "../actions";

// Sign-up in three short steps on one form: the page (name, link, where), the team and services, then
// contact and sign-in. Every step stays in the DOM, so the server action receives exactly the fields it
// always did; only the visible step changes. What the person types is kept in this tab's sessionStorage
// (never the password or the consent) so leaving and coming back does not start over.

const STEPS = ["page", "team", "contact"] as const;
const DRAFT_KEY = "sw:join-draft:v1";
const KEPT = ["name", "handle", "city", "kind", "teamRoles", "services", "newServices", "whatsapp", "whatsappCountry", "ref", "email"] as const;

type Draft = Partial<Record<(typeof KEPT)[number], string | string[]>> & { step?: number; /** Set when the form was sent: the next visit starts clean unless the server answered with an error. */ submitted?: boolean };

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/** The step a server-side error belongs to, so the person lands on the field to fix. */
const STEP_OF_ERROR: Record<string, number> = { handleTaken: 0, handleInvalid: 0, handleReserved: 0, emailTaken: 2, invalidEmail: 2, invalidPhone: 2, passwordShort: 2, consentRequired: 2 };

export function JoinForm({ countries, defaultCountry, phoneCountry, refCode = "", invite = "", popular, roles, aside }: { countries: CountryOption[]; defaultCountry: string; phoneCountry: string; refCode?: string; /** A collaborator's invitation token (docs/48), accepted once the page exists. */ invite?: string; popular: string[]; roles: { key: string; label: string }[]; /** Notices shown beside the steps (registration phase, Behance import). */ aside?: ReactNode }) {
  const t = useTranslations("Auth");
  const [state, action] = useActionState(join, undefined);
  const form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  // The draft is read after mount (sessionStorage is this browser's); the fields remount once with it.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [restored, setRestored] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [handle, setHandle] = useState(state?.fields?.handle ?? "");

  // Restore after hydration (the server render is always step 1 with empty fields), as components/match/chat.tsx does.
  useEffect(() => {
    const saved = readDraft();
    const id = setTimeout(() => {
      if (saved && !saved.submitted) {
        setDraft(saved);
        setStep(Math.min(STEPS.length - 1, Math.max(0, saved.step ?? 0)));
        setHandle((current) => current || one(saved.handle));
      } else if (saved?.submitted) writeDraft(null);
      setRestored(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // A server-side error brings the person back to the step that owns the field, with their answers kept.
  useEffect(() => {
    if (!state?.error) return;
    const error = state.error;
    const id = setTimeout(() => {
      setStep(STEP_OF_ERROR[error] ?? 2);
      const saved = readDraft();
      if (saved) writeDraft({ ...saved, submitted: false });
    }, 0);
    return () => clearTimeout(id);
  }, [state]);

  const f = state?.fields ?? {};
  const d = draft ?? {};

  const save = useCallback((atStep = step) => {
    const el = form.current;
    if (!el) return;
    const data = new FormData(el);
    const next: Draft = { step: atStep };
    for (const key of KEPT) {
      const values = data.getAll(key).map(String).filter((v) => v !== "");
      if (values.length) next[key] = values.length > 1 || key === "teamRoles" || key === "services" || key === "newServices" ? values : values[0];
    }
    writeDraft(next);
  }, [step]);
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 250);
  }, [save]);

  const panel = (i: number) => form.current?.querySelector<HTMLElement>(`[data-step-panel="${i}"]`) ?? null;
  const firstInvalid = (i: number) => {
    const fields = panel(i)?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea") ?? [];
    for (const field of fields) if (!field.checkValidity()) return field;
    return null;
  };
  const go = (i: number) => {
    setStep(i);
    save(i);
    requestAnimationFrame(() => panel(i)?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select")?.focus());
  };
  const next = () => {
    const bad = firstInvalid(step);
    if (bad) {
      bad.reportValidity();
      return;
    }
    if (step < STEPS.length - 1) go(step + 1);
  };

  return (
    <form
      ref={form}
      action={action}
      className="sw-join-steps"
      data-testid="join-form"
      data-step={step}
      onInput={scheduleSave}
      onChange={scheduleSave}
      onClickCapture={scheduleSave}
      onKeyDown={(e) => {
        // Enter moves to the next step until the last one; there it submits as usual.
        if (e.key === "Enter" && step < STEPS.length - 1 && e.target instanceof HTMLInputElement && e.target.type !== "checkbox" && e.target.type !== "radio" && !e.target.closest("[role=combobox]")) {
          e.preventDefault();
          next();
        }
      }}
      onSubmit={(e) => {
        // Every step's fields are checked before the account is created; an invalid earlier step is shown again.
        for (let i = 0; i < STEPS.length; i++) {
          const bad = firstInvalid(i);
          if (bad) {
            e.preventDefault();
            go(i);
            requestAnimationFrame(() => bad.reportValidity());
            return;
          }
        }
        const saved = readDraft();
        writeDraft({ ...(saved ?? {}), submitted: true });
      }}
    >
      <aside className="sw-join-rail">
        <ol className="sw-join-rail-steps" aria-label={t("stepOf", { n: step + 1, total: STEPS.length })}>
          {STEPS.map((key, i) => (
            <li key={key} data-state={i === step ? "current" : i < step ? "done" : "todo"} aria-current={i === step ? "step" : undefined}>
              <button type="button" className="sw-join-rail-step" onClick={() => (i < step ? go(i) : i === step ? undefined : next())} data-testid={`join-step-${key}`} aria-disabled={i > step}>
                <span className="sw-join-rail-number" aria-hidden>{i < step ? <Check className="size-4" /> : i + 1}</span>
                <span className="sw-join-rail-text"><strong>{t(`steps.${key}.title`)}</strong><span>{t(`steps.${key}.hint`)}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <p className="sw-join-draft-note" data-testid="join-draft-note">{t("draftNote")}</p>
      </aside>

      <div className="sw-join-panels" key={restored ? "restored" : "fresh"}>
        {invite && <input type="hidden" name="invite" value={invite} />}
        <p className="sw-join-progress" data-testid="join-progress">{t("stepOf", { n: step + 1, total: STEPS.length })} · <strong>{t(`steps.${STEPS[step]}.title`)}</strong></p>
        <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />

        <div data-step-panel="0" hidden={step !== 0} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <div className="grid gap-1.5">
              <Label htmlFor="name">{t("agencyName")}</Label>
              <Input id="name" name="name" required maxLength={80} defaultValue={f.name || one(d.name)} autoComplete="organization" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="handle">{t("handle")}</Label>
              <Input id="handle" name="handle" required dir="ltr" autoCapitalize="none" maxLength={30} value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))} />
              <p className="text-xs text-muted-foreground" dir="auto">{t("handleHint", { handle: handle || "your.agency" })}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CountryCityField countries={countries} defaultCountry={defaultCountry} defaultCity={f.city || one(d.city) || undefined} countryLabel={t("country")} cityLabel={t("city")} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm" />
          </div>
        </div>

        <div data-step-panel="1" hidden={step !== 1} className="grid gap-4">
          {/* Agency or freelancer, who's on the team, and what they offer: enough to match them from day one. */}
          <TeamFields kind={one(d.kind) === "freelancer" ? "freelancer" : "agency"} roles={roles} teamRoles={many(d.teamRoles)} seeksRoles={[]} compact />
          <div className="grid gap-1.5">
            <p className="text-sm font-medium">{t("joinServices")}</p>
            <ServicePicker popular={popular} defaultKeys={many(d.services)} />
            <p className="text-xs text-muted-foreground">{t("joinServicesHint")}</p>
          </div>
        </div>

        <div data-step-panel="2" hidden={step !== 2} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <div className="grid gap-1.5">
              <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
              <PhoneField id="whatsapp" name="whatsapp" required defaultCountry={f.whatsappCountry || one(d.whatsappCountry) || phoneCountry} defaultValue={f.whatsapp || one(d.whatsapp)} countryLabel={t("phoneCountry")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ref">{t("refCode")}</Label>
              <Input id="ref" name="ref" dir="ltr" autoCapitalize="none" maxLength={24} defaultValue={f.ref || one(d.ref) || refCode} placeholder={t("refCodePlaceholder")} data-testid="join-ref" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" defaultValue={f.email || one(d.email)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required dir="ltr" />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" required className="mt-1 size-4 accent-[var(--primary)]" />
            <span>
              {t("consent")}{" "}
              <Link href="/legal" className="text-brand underline">↗</Link>
            </span>
          </label>
        </div>

        <div className="sw-join-actions">
          {step > 0 && <Button type="button" variant="outline" onClick={() => go(step - 1)} data-testid="join-back">{t("back")}</Button>}
          {step < STEPS.length - 1
            ? <Button type="button" onClick={next} data-testid="join-next" className="sw-join-next">{t("next")}</Button>
            : <SubmitButton className="h-10 sw-join-next">{t("joinButton")}</SubmitButton>}
        </div>
      </div>

      {/* Notices come after the fields on a phone (the form stays first) and under the rail on a laptop. */}
      {aside && <div className="sw-join-aside">{aside}</div>}
    </form>
  );
}
