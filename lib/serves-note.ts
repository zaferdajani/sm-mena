import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { servesNoteFor } from "@/lib/core/options/serves-note";

/** Next binding of lib/core/options/serves-note.ts: "Based in Jordan · takes clients in Saudi Arabia". */
export async function servesNote(agency: { country: string; servesCountries: string[] }, viewCountry?: string | null): Promise<string | null> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Profile")]);
  return servesNoteFor(locale, t, agency, viewCountry);
}
