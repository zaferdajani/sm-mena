"use client";

import { useEffect, useState } from "react";

export type CountryOption = { code: string; name: string; flag: string; cities: { key: string; label: string }[] };

/** Country, then a city in it. Only the city is submitted: it tells the country (lib/countries.ts). */
export function CountryCityField({
  countries,
  defaultCountry,
  defaultCity,
  countryLabel,
  cityLabel,
  className,
}: {
  countries: CountryOption[];
  defaultCountry: string;
  defaultCity?: string;
  countryLabel: string;
  cityLabel: string;
  className: string;
}) {
  const initial = countries.find((c) => c.cities.some((x) => x.key === defaultCity))?.code ?? defaultCountry;
  const [country, setCountry] = useState(initial);
  const cities = countries.find((c) => c.code === country)?.cities ?? [];
  const [city, setCity] = useState(defaultCity && cities.some((c) => c.key === defaultCity) ? defaultCity : (cities[0]?.key ?? ""));
  // A country picked before React hydrated (slow connections) must not snap back: adopt what the select holds.
  useEffect(() => {
    const el = document.getElementById("country") as HTMLSelectElement | null;
    const picked = el?.value;
    if (!picked || picked === initial || !countries.some((c) => c.code === picked)) return;
    const id = setTimeout(() => {
      setCountry(picked);
      setCity(countries.find((c) => c.code === picked)?.cities[0]?.key ?? "");
    }, 0);
    return () => clearTimeout(id);
    // Runs once after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="country" className="text-sm font-medium">{countryLabel}</label>
        <select
          id="country"
          value={country}
          onChange={(e) => {
            const next = e.target.value;
            setCountry(next);
            setCity(countries.find((c) => c.code === next)?.cities[0]?.key ?? "");
          }}
          className={`w-full min-w-0 ${className}`}
          data-testid="country-select"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="city" className="text-sm font-medium">{cityLabel}</label>
        <select id="city" name="city" required value={city} onChange={(e) => setCity(e.target.value)} className={`w-full min-w-0 ${className}`}>
          {cities.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
