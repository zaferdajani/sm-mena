// What a business owner tells us when registering early (docs/58-owner-early-registration.md).
// Pure: the page action and any later API route parse with the same rules.
import { z } from "zod";
import { BUSINESS_TYPES } from "@/lib/core/catalog/business-types";
import { citiesOf, COUNTRY_CODES, countryOfCity } from "@/lib/core/catalog/countries";
import { SERVICE_GROUPS } from "@/lib/core/catalog/services/catalog";

export const OWNER_TIMINGS = ["now", "month", "quarter", "later"] as const;
export type OwnerTiming = (typeof OWNER_TIMINGS)[number];
export const OWNER_SERVICE_GROUPS = SERVICE_GROUPS.map((g) => g.key);

const phone = z
  .string()
  .trim()
  .max(24)
  .regex(/^(\+?[\d\s()-]{7,22})?$/)
  .transform((v) => v.replace(/[\s()-]/g, "") || null);

export const ownerNeedSchema = z
  .object({
    country: z.enum(COUNTRY_CODES),
    city: z.string().trim().min(1).max(60),
    businessType: z
      .string()
      .trim()
      .max(40)
      .transform((v) => ((BUSINESS_TYPES as readonly string[]).includes(v) ? v : null)),
    services: z
      .array(z.string())
      .transform((arr) => Array.from(new Set(arr.filter((k) => OWNER_SERVICE_GROUPS.includes(k)))))
      .pipe(z.array(z.string()).min(1).max(OWNER_SERVICE_GROUPS.length)),
    timing: z.enum(OWNER_TIMINGS),
    whatsapp: phone,
    note: z
      .string()
      .trim()
      .max(400)
      .transform((v) => v || null),
  })
  .refine((d) => citiesOf(d.country).some((c) => c.key === d.city), { path: ["city"], message: "city" });

export type OwnerNeedInput = z.infer<typeof ownerNeedSchema>;

/**
 * FormData → the schema's input shape. Checkbox groups arrive as repeated keys; the country picker submits only
 * the city (components/country-city-field.tsx), so the country is read from it when absent.
 */
export function ownerNeedFromForm(form: FormData) {
  const str = (k: string) => (typeof form.get(k) === "string" ? String(form.get(k)) : "");
  const city = str("city");
  return {
    country: str("country") || countryOfCity(city) || "",
    city,
    businessType: str("businessType"),
    services: form.getAll("services").filter((v): v is string => typeof v === "string"),
    timing: str("timing"),
    whatsapp: str("whatsapp"),
    note: str("note"),
  };
}
