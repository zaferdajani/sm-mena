"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import "./country-picker.css";
import { countryFromPosition, countryFromTimeZone, isCountryCode, type CountryCode } from "@/lib/countries";

const COOKIE = "sw_country";
const CHANGED = "sw:country-change";
// Shared across header/sidebar instances. A later explicit choice invalidates
// any pending location callback, including a choice of the same country.
let selectionVersion = 0;

function readSavedCountry(): CountryCode | null {
  if (typeof document === "undefined") return null;
  const saved = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return isCountryCode(saved) ? saved : null;
}
function subscribe(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  window.addEventListener("pageshow", callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("pageshow", callback);
    window.removeEventListener("focus", callback);
  };
}
function save(code: CountryCode) {
  selectionVersion += 1;
  document.cookie = `${COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.dispatchEvent(new Event(CHANGED));
}
function locate(onFound: (code: CountryCode) => void, onFailed: () => void) {
  if (!("geolocation" in navigator)) return onFailed();
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const code = countryFromPosition(pos.coords.latitude, pos.coords.longitude);
      if (code) onFound(code);
      else onFailed();
    },
    onFailed,
    { timeout: 10_000, maximumAge: 24 * 3600 * 1000, enableHighAccuracy: false },
  );
}

/** The saved choice is shared by every picker, and always outranks late GPS
 * guesses. Server props provide the hydration snapshot, not a stale overwrite.
 * Country persistence, supported markets and native mobile selects are unchanged.
 */
export function CountryPicker({ current, chosen, options, label, locateLabel, locateFailedLabel, variant = "app" }: {
  current: CountryCode;
  chosen: boolean;
  options: { code: CountryCode; name: string; flag: string }[];
  label: string;
  locateLabel: string;
  /** Said when the location can't be read (permission refused, no signal, outside the supported countries). */
  locateFailedLabel?: string;
  /** "compact": the flag and a chevron, for the crowded phone header. */
  variant?: "app" | "landing" | "compact";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const mounted = useRef(false);
  const value = useSyncExternalStore(subscribe, () => readSavedCountry() ?? current, () => current);
  const [locating, setLocating] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const apply = (code: string) => {
    if (!isCountryCode(code)) return;
    save(code);
    start(() => router.refresh());
  };
  const locateExplicitly = () => {
    const version = ++selectionVersion;
    const before = readSavedCountry();
    setLocating(true);
    setFailed(false);
    locate(
      (code) => {
        if (!mounted.current) return;
        setLocating(false);
        if (version === selectionVersion && readSavedCountry() === before) apply(code);
      },
      () => {
        if (!mounted.current) return;
        setLocating(false);
        setFailed(true);
      },
    );
  };

  useEffect(() => {
    // Another mounted picker or a user interaction may already have saved a
    // choice since the server rendered `chosen=false`. Read the live cookie.
    if (chosen || readSavedCountry()) return;
    let active = true;
    // The first guess comes from the device's time zone. The browser's location prompt is never shown on
    // its own: it covered the welcome screen. The locate button asks, when the person taps it.
    const guess = countryFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? current;
    save(guess);
    if (active && guess !== current) start(() => router.refresh());
    return () => { active = false; };
    // First-visit detection only; later choices are synchronized by the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (variant === "compact") {
    const selected = options.find((o) => o.code === value) ?? options[0];
    return (
      <div className="relative flex h-9 shrink-0 items-center gap-0.5 rounded-md border px-1.5 text-base" data-pending={pending || undefined} data-testid="country-picker">
        <span aria-hidden="true">{selected.flag}</span>
        <svg aria-hidden="true" className="size-3.5 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8l4 4 4-4" /></svg>
        <select aria-label={label} className="absolute inset-0 cursor-pointer opacity-0" disabled={pending} onChange={(e) => apply(e.target.value)} value={value}>
          {options.map((o) => <option key={o.code} value={o.code}>{o.flag} {o.name}</option>)}
        </select>
      </div>
    );
  }
  if (variant === "landing") {
    const selected = options.find((o) => o.code === value) ?? options[0];
    return (
      <div className="sw-country" data-pending={pending || undefined} data-testid="country-picker">
        <span aria-hidden="true" className="sw-country__flag">{selected.flag}</span>
        <span aria-hidden="true" className="sw-country__name">{selected.name}</span>
        <svg aria-hidden="true" className="sw-country__chev" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" /></svg>
        <select aria-label={label} className="sw-country__select" disabled={pending} onChange={(e) => apply(e.target.value)} value={value}>
          {options.map((o) => <option key={o.code} value={o.code}>{o.flag} {o.name}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1" data-pending={pending || undefined} data-testid="country-picker">
      <select aria-label={label} value={value} disabled={pending} onChange={(e) => apply(e.target.value)} className="h-8 min-w-0 max-w-40 rounded-md border bg-background px-1.5 text-sm">
        {options.map((o) => <option key={o.code} value={o.code}>{o.flag} {o.name}</option>)}
      </select>
      <button type="button" onClick={locateExplicitly} disabled={locating} aria-label={locateLabel} title={locateLabel} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" data-testid="country-locate">
        <LocateFixed className={locating ? "size-4 animate-pulse text-brand" : "size-4"} />
      </button>
      {failed && locateFailedLabel && <span role="status" className="text-xs text-muted-foreground" data-testid="country-locate-failed">{locateFailedLabel}</span>}
    </div>
  );
}
