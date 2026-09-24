"use client";

import { useState } from "react";

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
  return (
    <>
      <div className="grid gap-1.5">
        <label htmlFor="country" className="text-sm font-medium">{countryLabel}</label>
        <select
          id="country"
          value={country}
          onChange={(e) => {
            const next = e.target.value;
            setCountry(next);
            setCity(countries.find((c) => c.code === next)?.cities[0]?.key ?? "");
          }}
          className={className}
          data-testid="country-select"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="city" className="text-sm font-medium">{cityLabel}</label>
        <select id="city" name="city" required value={city} onChange={(e) => setCity(e.target.value)} className={className}>
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
