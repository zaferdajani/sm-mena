import { z } from "zod";
import type { AgencyTranslation, ClientTranslation, PackageTranslation, PostTranslation } from "@/lib/db/schema";

export type { AgencyTranslation, ClientTranslation, PackageTranslation, PostTranslation };

/**
 * Agencies write their page in one language (`agencies.content_lang`) and may
 * add the same text in the other one (`translation` on the agency, its posts,
 * clients and packages). Readers see their own language when it is there,
 * else the agency's main text. Legal names (contracts, NDAs) use the main text.
 */
export const CONTENT_LANGS = ["ar", "en"] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

export const contentLang = (value: unknown): ContentLang => (value === "en" ? "en" : "ar");
export const otherLang = (lang: ContentLang): ContentLang => (lang === "ar" ? "en" : "ar");

/** Prefix of the form fields that carry the other-language text (e.g. `tr_bio`). */
export const TR = "tr_";

const text = (max: number) => z.string().trim().max(max).optional();
const lines = (maxItems: number, maxLen: number) =>
  z
    .string()
    .max(maxItems * (maxLen + 2))
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((s) => s.trim().replace(/^[-•*·]\s*/, "").slice(0, maxLen))
        .filter(Boolean)
        .slice(0, maxItems),
    );

export const agencyTranslationSchema = z.object({ name: text(80), bio: text(500), about: text(1500), strengths: lines(6, 80) });
export const postTranslationSchema = z.object({ caption: text(2200), result: text(80) });
export const clientTranslationSchema = z.object({ name: text(80), description: text(500) });
export const packageTranslationSchema = z.object({ title: text(80), description: text(300), deliverables: lines(12, 200) });

/** Drops empty values, so a blank field keeps falling back to the main text. */
export function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(value)) {
    if (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Reads `tr_*` fields from a form and validates them; returns only filled values, or null when invalid. */
export function readTranslation<S extends z.ZodTypeAny>(formData: FormData, schema: S): Partial<z.infer<S>> | null {
  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (k.startsWith(TR) && typeof v === "string") raw[k.slice(TR.length)] = v;
  const parsed = schema.safeParse(raw);
  return parsed.success ? compact(parsed.data as Record<string, unknown>) as Partial<z.infer<S>> : null;
}

/**
 * The text a reader sees: each field from `translation` when the reader's
 * locale differs from the content's language and that field is filled there,
 * else the main text.
 */
export function localized<T extends object>(main: T, translation: object | null | undefined, lang: string, locale: string): T {
  if (!translation || locale === lang) return main;
  const filled = compact(translation as Record<string, unknown>);
  const out = { ...main } as Record<string, unknown>;
  for (const [k, v] of Object.entries(filled)) if (k in out) out[k] = v;
  return out as T;
}

/** Both languages' text for search, so a search in either language finds it. */
export function translationSearchText(translation: object | null | undefined): string {
  return Object.values(compact((translation ?? {}) as Record<string, unknown>))
    .flat()
    .join(" ");
}

type PostLike = {
  caption: string;
  result: string | null;
  contentLang: ContentLang;
  translation: PostTranslation;
  agency: { name: string; nameTranslation: string | null; contentLang: ContentLang };
};

/** An agency's name in the reader's language (falls back to the main name). */
export function agencyName(a: { name: string; nameTranslation?: string | null; contentLang: ContentLang | string }, locale: string): string {
  return locale !== a.contentLang && a.nameTranslation ? a.nameTranslation : a.name;
}

/** A post's caption, result and agency name in the reader's language. Safe to apply twice. */
export function localizedPost<P extends PostLike>(post: P, locale: string): P {
  const text = localized({ caption: post.caption, result: post.result }, post.translation, post.contentLang, locale);
  return { ...post, ...text, agency: { ...post.agency, name: agencyName(post.agency, locale) } };
}

/** An agency's name, bio, about and strengths in the reader's language. */
export function localizedAgency<A extends { name: string; bio: string; about: string; strengths: string[]; contentLang: string; translation: AgencyTranslation | null }>(a: A, locale: string): A {
  return { ...a, ...localized({ name: a.name, bio: a.bio, about: a.about, strengths: a.strengths }, a.translation, a.contentLang, locale) };
}
