"use client";

import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ARAB_FIRST, DIAL_CODES, flagOf } from "@/lib/dial-codes";

/**
 * A phone number with its country code: a compact "🇯🇴 +962" button (a native
 * select, so phones show their own picker) and the local number. The country
 * starts as the visitor's (from the IP address), and can be changed to any
 * country. Submits `<name>` (the number as typed) and `<name>Country` (ISO code);
 * the server joins them (lib/dial-codes.ts → internationalPhone).
 */
export function PhoneField({ id, name, defaultCountry, defaultValue = "", required = false, placeholder, countryLabel }: { id: string; name: string; defaultCountry: string; defaultValue?: string; required?: boolean; placeholder?: string; countryLabel: string }) {
  const locale = useLocale();
  const [country, setCountry] = useState(defaultCountry.toUpperCase());
  // Country names and their order come from the browser's Intl data, which can
  // differ from the server's: the full list is built after hydration, so the
  // first render (server and browser alike) holds just the chosen country.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const options = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale], { type: "region" });
    } catch {}
    const label = (c: string) => names?.of(c) ?? c;
    const rest = Object.keys(DIAL_CODES)
      .filter((c) => !ARAB_FIRST.includes(c))
      .sort((a, b) => label(a).localeCompare(label(b), locale));
    return { arab: ARAB_FIRST.map((c) => ({ c, name: label(c) })), rest: rest.map((c) => ({ c, name: label(c) })) };
  }, [locale]);
  const option = ({ c, name: n }: { c: string; name: string }) => (
    <option key={c} value={c}>
      {`${flagOf(c)} ${n} +${DIAL_CODES[c]}`}
    </option>
  );

  return (
    <div dir="ltr" className="flex gap-2" data-testid={`phone-${name}`}>
      <label className="relative flex h-9 shrink-0 items-center gap-1 rounded-md border bg-transparent px-2 text-sm focus-within:ring-3 focus-within:ring-ring/50">
        <span aria-hidden className="text-base leading-none">{flagOf(country)}</span>
        <span className="tabular-nums" data-testid="phone-dial">+{DIAL_CODES[country]}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        <select
          name={`${name}Country`}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-label={countryLabel}
          className="absolute inset-0 cursor-pointer opacity-0"
          data-testid="phone-country"
        >
          {ready ? (
            <>
              <optgroup label="—">{options.arab.map(option)}</optgroup>
              <optgroup label="—">{options.rest.map(option)}</optgroup>
            </>
          ) : (
            <option value={country}>{`${flagOf(country)} +${DIAL_CODES[country]}`}</option>
          )}
        </select>
      </label>
      <Input id={id} name={name} type="tel" inputMode="tel" autoComplete="tel-national" required={required} placeholder={placeholder} defaultValue={defaultValue} className="min-w-0 flex-1" />
    </div>
  );
}
