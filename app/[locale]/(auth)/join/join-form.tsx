"use client";

import { useTranslations } from "next-intl";
import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CountryCityField, type CountryOption } from "@/components/country-city-field";
import { PhoneField } from "@/components/forms/phone-field";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { HANDLE_PATTERN, suggestHandle } from "@/lib/text";
import { join } from "../actions";

// Sign-up on one screen (docs/65): who you are, where, how to reach you, a password, and the two
// consents. Services, team and specialties are asked once, later, on the first project. The page link is
// suggested from the name and can be edited. Errors appear under the field, in the page's language, never
// as the browser's own bubbles. What the person types is kept in this tab's sessionStorage (never the
// password or the consents) so leaving and coming back does not start over.

const DRAFT_KEY = "sw:join-draft:v1";
const KEPT = ["name", "handle", "city", "kind", "whatsapp", "whatsappCountry", "ref", "email"] as const;
type Field = "name" | "handle" | "city" | "whatsapp" | "email" | "password" | "consent" | "adult";
type Draft = Partial<Record<(typeof KEPT)[number], string>> & { submitted?: boolean };

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

/** The field a server-side error belongs to, so the message sits where the fix is. */
const FIELD_OF_ERROR: Partial<Record<string, Field>> = { handleTaken: "handle", handleInvalid: "handle", handleReserved: "handle", emailTaken: "email", invalidEmail: "email", invalidPhone: "whatsapp", passwordShort: "password", consentRequired: "consent", adultRequired: "adult" };

function focusIn(form: HTMLFormElement | null, field: Field) {
  const el = form?.querySelector<HTMLElement>(`[name="${field}"]`);
  el?.scrollIntoView({ block: "center" });
  el?.focus({ preventScroll: true });
}

/** The same rules as lib/validation/auth.ts (joinSchema), checked before the form leaves the browser. */
function firstProblem(fd: FormData): { field: Field; error: string } | null {
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  if (v("name").length < 2) return { field: "name", error: "required" };
  if (!HANDLE_PATTERN.test(v("handle").toLowerCase()) || v("handle").includes("..")) return { field: "handle", error: "handleInvalid" };
  if (!v("city")) return { field: "city", error: "required" };
  if (v("whatsapp").replace(/\D/g, "").length < 7) return { field: "whatsapp", error: "invalidPhone" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) return { field: "email", error: "invalidEmail" };
  if (String(fd.get("password") ?? "").length < 8) return { field: "password", error: "passwordShort" };
  if (fd.get("consent") !== "on") return { field: "consent", error: "consentRequired" };
  if (fd.get("adult") !== "on") return { field: "adult", error: "adultRequired" };
  return null;
}

export function JoinForm({ countries, defaultCountry, phoneCountry, refCode = "", invite = "", aside }: { countries: CountryOption[]; defaultCountry: string; phoneCountry: string; refCode?: string; /** A collaborator's invitation token (docs/48), accepted once the page exists. */ invite?: string; /** Notices shown under the form (registration phase). */ aside?: ReactNode }) {
  const t = useTranslations("Auth");
  const tk = useTranslations("Partners.form");
  const [state, action] = useActionState(join, undefined);
  const form = useRef<HTMLFormElement>(null);
  // The draft is read after mount (sessionStorage is this browser's); the fields remount once with it.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [restored, setRestored] = useState(false);
  const [problem, setProblem] = useState<{ field: Field; error: string } | null>(null);
  const [kind, setKind] = useState<"agency" | "freelancer">("agency");
  const [handle, setHandle] = useState(state?.fields?.handle ?? "");
  // Once the person edits the link themselves, the name stops rewriting it.
  const handleEdited = useRef(Boolean(state?.fields?.handle));
  const [refOpen, setRefOpen] = useState(Boolean(refCode || state?.fields?.ref));

  useEffect(() => {
    const saved = readDraft();
    const id = setTimeout(() => {
      if (saved && !saved.submitted) {
        setDraft(saved);
        if (saved.kind === "freelancer") setKind("freelancer");
        if (saved.handle) { setHandle((current) => current || saved.handle!); handleEdited.current = true; }
        if (saved.ref) setRefOpen(true);
      } else if (saved?.submitted) writeDraft(null);
      setRestored(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // A server-side error is shown under its field, with the answers kept.
  useEffect(() => {
    if (!state?.error) return;
    const error = state.error;
    const id = setTimeout(() => {
      const field = FIELD_OF_ERROR[error];
      setProblem(field ? { field, error } : null);
      if (field === "handle") handleEdited.current = true;
      const saved = readDraft();
      if (saved) writeDraft({ ...saved, submitted: false });
      focusIn(form.current, field ?? "name");
    }, 0);
    return () => clearTimeout(id);
  }, [state]);

  const f = state?.fields ?? {};
  const d = draft ?? {};

  const save = useCallback(() => {
    const el = form.current;
    if (!el) return;
    const data = new FormData(el);
    const next: Draft = {};
    for (const key of KEPT) {
      const value = String(data.get(key) ?? "");
      if (value) next[key] = value;
    }
    writeDraft(next);
  }, []);
  useEffect(() => {
    const flush = () => save();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [save]);

  const err = (field: Field) => (problem?.field === field ? t(`errors.${problem.error}` as never) : null);
  const errorLine = (field: Field) => {
    const text = err(field);
    return text ? <p id={`join-error-${field}`} role="alert" className="sw-field-error" data-testid={`join-error-${field}`}>{text}</p> : null;
  };
  const invalid = (field: Field) => (problem?.field === field ? { "aria-invalid": true as const, "aria-describedby": `join-error-${field}` } : {});

  const onName = (value: string) => {
    if (handleEdited.current) return;
    const next = suggestHandle(value);
    setHandle(next);
    const input = form.current?.elements.namedItem("handle") as HTMLInputElement | null;
    if (input) input.value = next;
  };
  const onEmail = (value: string) => {
    // An Arabic name gives no link; the email's local part does.
    if (handleEdited.current || handle) return;
    onName(value.split("@")[0] ?? "");
  };

  return (
    <form
      ref={form}
      action={action}
      noValidate
      className="sw-join-one sw-swiss-form"
      data-testid="join-form"
      data-ready={restored ? "true" : undefined}
      onInput={save}
      onChange={save}
      onSubmit={(e) => {
        const found = firstProblem(new FormData(e.currentTarget));
        if (found) {
          e.preventDefault();
          setProblem(found);
          focusIn(form.current, found.field);
          return;
        }
        setProblem(null);
        const saved = readDraft();
        writeDraft({ ...(saved ?? {}), submitted: true });
      }}
    >
      <div className="grid gap-4" key={draft ? "draft" : "fresh"}>
        {invite && <input type="hidden" name="invite" value={invite} />}
        <FormError message={state?.error && !FIELD_OF_ERROR[state.error] ? t(`errors.${state.error}` as never) : undefined} />

        {/* Agency or freelancer: a preset, one tap to change. Team roles come later, from the Studio. */}
        <fieldset className="sw-join-kind" data-testid="team-fields">
          <legend className="sr-only">{tk("kind")}</legend>
          <label className="sw-join-kind-option">
            <input type="radio" name="kind" value="agency" checked={kind === "agency"} onChange={() => setKind("agency")} data-testid="kind-agency" />
            <span>{tk("agency")}</span>
          </label>
          <label className="sw-join-kind-option">
            <input type="radio" name="kind" value="freelancer" checked={kind === "freelancer"} onChange={() => setKind("freelancer")} data-testid="kind-freelancer" />
            <span>{tk("freelancer")}</span>
          </label>
        </fieldset>

        <div className="sw-join-field grid gap-1.5">
          <Label htmlFor="name">{kind === "freelancer" ? t("freelancerName") : t("agencyName")}</Label>
          <Input id="name" name="name" required maxLength={80} defaultValue={f.name || d.name} autoComplete="organization" onChange={(e) => onName(e.target.value)} {...invalid("name")} />
          {errorLine("name")}
        </div>
        <div className="sw-join-field grid gap-1.5">
          <Label htmlFor="handle">{t("handle")}</Label>
          {/* Uncontrolled on purpose: what is typed before React has hydrated (slow connections, Safari) must survive hydration. */}
          <Input
              id="handle"
              name="handle"
              required
              dir="ltr"
              autoCapitalize="none"
              maxLength={30}
              defaultValue={f.handle || d.handle}
              onChange={(e) => {
                const clean = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "");
                if (clean !== e.target.value) e.target.value = clean;
                handleEdited.current = true;
                setHandle(clean);
              }}
              {...invalid("handle")}
            />
          <p className="text-xs text-muted-foreground" dir="auto">{t("handleHint", { handle: handle || "your.agency" })} {t("handleAuto")}</p>
          {errorLine("handle")}
        </div>
        <div className="sw-join-location-grid grid gap-4">
          <CountryCityField countries={countries} defaultCountry={defaultCountry} defaultCity={f.city || d.city || undefined} countryLabel={t("country")} cityLabel={t("city")} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm" />
        </div>
        {errorLine("city")}
        <div data-step-panel="2" className="grid gap-4">
        <div className="sw-join-field sw-join-phone-field grid gap-1.5">
          <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
          <PhoneField id="whatsapp" name="whatsapp" required defaultCountry={f.whatsappCountry || d.whatsappCountry || phoneCountry} defaultValue={f.whatsapp || d.whatsapp} countryLabel={t("phoneCountry")} />
          {errorLine("whatsapp")}
        </div>
        <div className="sw-join-field grid gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" defaultValue={f.email || d.email} onChange={(e) => onEmail(e.target.value)} {...invalid("email")} />
          {errorLine("email")}
        </div>
        <div className="sw-join-field grid gap-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required dir="ltr" {...invalid("password")} />
          <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          {errorLine("password")}
        </div>

        {/* The agent code matters to few people: one line until it is needed, open when a link carried it. */}
        {refOpen ? (
          <div className="sw-join-field grid gap-1.5">
            <Label htmlFor="ref">{t("refCode")}</Label>
            <Input id="ref" name="ref" dir="ltr" autoCapitalize="none" maxLength={24} defaultValue={f.ref || d.ref || refCode} placeholder={t("refCodePlaceholder")} data-testid="join-ref" />
          </div>
        ) : (
          <button type="button" className="justify-self-start text-sm text-muted-foreground underline underline-offset-4" onClick={() => setRefOpen(true)} data-testid="join-ref-open">
            {t("refCodeOpen")}
          </button>
        )}

        <label className="sw-join-consent flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" required className="mt-1 size-4 accent-[var(--primary)]" {...invalid("consent")} />
          <span>
            {t("consent")}{" "}
            <Link href="/legal" className="text-brand underline">{t("consentLink")}</Link>
          </span>
        </label>
        {errorLine("consent")}
        <label className="sw-join-consent flex items-start gap-3 text-sm">
          <input type="checkbox" name="adult" required className="mt-1 size-4 accent-[var(--primary)]" data-testid="join-adult" {...invalid("adult")} />
          <span>{t("adult")}</span>
        </label>
        {errorLine("adult")}
        {/* Unticked by default (docs/65 stage 4): at most 3 emails over 7 days, none once the page is ready. */}
        <label className="sw-join-consent flex items-start gap-3 text-sm">
          <input type="checkbox" name="reminders" className="mt-1 size-4 accent-[var(--primary)]" data-testid="join-reminders" />
          <span>{t("reminders")}</span>
        </label>
        </div>

        <div className="sw-join-actions">
          <SubmitButton className="h-10 sw-join-next">{t("joinButton")}</SubmitButton>
        </div>
        <p className="sw-join-draft-note" data-testid="join-draft-note">{t("draftNote")}</p>
      </div>

      {aside && <div className="sw-join-aside">{aside}</div>}
    </form>
  );
}
