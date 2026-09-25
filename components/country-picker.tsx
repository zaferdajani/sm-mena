"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { countryFromPosition, countryFromTimeZone, type CountryCode } from "@/lib/countries";

const COOKIE = "sw_country";
const ASKED = "sw_country_gps"; // we asked the browser for the location once

function save(code: CountryCode) {
  document.cookie = `${COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function locate(onFound: (code: CountryCode) => void) {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const code = countryFromPosition(pos.coords.latitude, pos.coords.longitude);
      if (code) onFound(code);
    },
    () => {},
    { timeout: 10_000, maximumAge: 24 * 3600 * 1000, enableHighAccuracy: false },
  );
}

/**
 * Which country's agencies to show. The server's `current` is the saved choice,
 * else the country of the visitor's IP address, else Jordan. First visit: the
 * device's time zone refines that guess (when it names one of our countries),
 * then the browser's location (GPS, with the visitor's permission) confirms it;
 * the choice is remembered and can be changed here.
 *
 * `variant="landing"` draws it for the landing page header (flag and name on a
 * pill, styled by components/landing/site.css) without the location button.
 */
export function CountryPicker({
  current,
  chosen,
  options,
  label,
  locateLabel,
  variant = "app",
}: {
  current: CountryCode;
  chosen: boolean;
  options: { code: CountryCode; name: string; flag: string }[];
  label: string;
  locateLabel: string;
  variant?: "app" | "landing";
}) {
  const router = useRouter();
  const [value, setValue] = useState<CountryCode>(current);
  const [pending, start] = useTransition();
  // Follow the server's value after a refresh (the detected country arrives as `current`).
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setValue(current);
  }

  const apply = (code: CountryCode) => {
    setValue(code);
    save(code);
    start(() => router.refresh());
  };

  useEffect(() => {
    if (chosen) return;
    // Never fall back to Jordan here: `current` already carries the server's
    // best guess (IP country), which a time zone outside the region must not undo.
    const guess = countryFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? current;
    save(guess);
    if (guess !== current) start(() => router.refresh());
    if (!document.cookie.includes(`${ASKED}=1`)) {
      document.cookie = `${ASKED}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      locate((code) => {
        if (code !== guess) {
          setValue(code);
          save(code);
          start(() => router.refresh());
        }
      });
    }
    // Runs once for a visitor without a saved country.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (variant === "landing") {
    const selected = options.find((o) => o.code === value) ?? options[0];
    return (
      <div className="sw-country" data-pending={pending || undefined} data-testid="country-picker">
        <span aria-hidden="true" className="sw-country__flag">
          {selected.flag}
        </span>
        <span aria-hidden="true" className="sw-country__name">
          {selected.name}
        </span>
        <svg aria-hidden="true" className="sw-country__chev" viewBox="0 0 20 20">
          <path d="M6 8l4 4 4-4" />
        </svg>
        {/* The native select sits invisibly on top: the phone's own picker, full keyboard support. */}
        <select aria-label={label} className="sw-country__select" disabled={pending} onChange={(e) => apply(e.target.value as CountryCode)} value={value}>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.flag} {o.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1" data-testid="country-picker">
      {/* min-w-0: on narrow phones the select gives way instead of widening the header. */}
      <select
        aria-label={label}
        value={value}
        disabled={pending}
        onChange={(e) => apply(e.target.value as CountryCode)}
        className="h-8 min-w-0 max-w-40 rounded-md border bg-background px-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.flag} {o.name}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => locate(apply)} aria-label={locateLabel} title={locateLabel} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
        <LocateFixed className="size-4" />
      </button>
    </div>
  );
}
