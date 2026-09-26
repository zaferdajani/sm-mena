// The service vocabulary (docs/30-services-and-partners.md), usable on the
// server and in the browser. Built-in tags come from the researched catalog in
// data/service-catalog.json; tags an admin approved later are added at run time
// with registerTags() (the locale layout does it on both sides).
import catalog from "@/data/service-catalog.json";
import { isServiceKey } from "@/lib/taxonomy";
import { normalizeForSearch } from "@/lib/text";

export type TagInfo = {
  key: string;
  nameAr: string;
  nameEn: string;
  group: string;
  /** The closest core service (lib/taxonomy.ts); hire pages and matching use it. */
  parent: string | null;
  aliases: string[];
  roles: string[];
};

type CatalogFile = {
  groups: { key: string; name_ar: string; name_en: string }[];
  roles: { key: string; name_ar: string; name_en: string }[];
  services: { key: string; group: string; name_ar: string; name_en: string; aliases?: string[]; roles?: string[]; parent?: string }[];
};

const file = catalog as CatalogFile;

export const SERVICE_GROUPS = file.groups;
export const ROLES = file.roles;
export const ROLE_KEYS = ROLES.map((r) => r.key);

/** The roles asked about at sign-up ("which do you have in house?"). */
export const JOIN_ROLES = ["photographer", "videographer", "video_editor", "graphic_designer", "motion_designer", "content_writer_ar", "media_buyer", "web_developer", "seo_specialist", "voice_over"].filter((r) => ROLE_KEYS.includes(r));

export const BUILTIN_TAGS: TagInfo[] = file.services.map((s) => ({
  key: s.key,
  nameAr: s.name_ar,
  nameEn: s.name_en,
  group: s.group,
  parent: s.parent ?? (isServiceKey(s.key) ? s.key : null),
  aliases: s.aliases ?? [],
  roles: s.roles ?? [],
}));

const registry = new Map<string, TagInfo>(BUILTIN_TAGS.map((t) => [t.key, t]));
const searchIndex = new Map<string, string>();
const indexOf = (t: TagInfo) => {
  let s = searchIndex.get(t.key);
  if (!s) {
    s = normalizeForSearch([t.nameAr, t.nameEn, ...t.aliases, t.key.replace(/_/g, " ")].join(" | "));
    searchIndex.set(t.key, s);
  }
  return s;
};

/** Adds tags approved after the catalog was written (custom tags from the database). */
export function registerTags(tags: TagInfo[]) {
  for (const t of tags) {
    registry.set(t.key, t);
    searchIndex.delete(t.key);
  }
}

export const tagInfo = (key: string) => registry.get(key) ?? null;
export const allTags = () => [...registry.values()];
export const isKnownService = (key: string) => registry.has(key) || isServiceKey(key);

export function tagLabel(key: string, locale: string): string | null {
  const t = registry.get(key);
  return t ? (locale === "ar" ? t.nameAr : t.nameEn) : null;
}

export function roleLabel(key: string, locale: string): string {
  const r = ROLES.find((x) => x.key === key);
  return r ? (locale === "ar" ? r.name_ar : r.name_en) : key;
}

/** Selected services plus their core parents, so hire pages and matching find the agency. */
export function withParents(keys: string[]): string[] {
  const out = new Set<string>();
  for (const k of keys) {
    if (!isKnownService(k)) continue;
    out.add(k);
    const p = registry.get(k)?.parent;
    if (p && isServiceKey(p)) out.add(p);
  }
  return [...out];
}

/** Roles that usually deliver these services (for partner suggestions). */
export function rolesOf(keys: string[]): Set<string> {
  const out = new Set<string>();
  for (const k of keys) for (const r of registry.get(k)?.roles ?? []) out.add(r);
  return out;
}

/**
 * Type-ahead: tags whose name, alias or key contains every typed word; names
 * that start with the text come first. Arabic letter variants and diacritics
 * are ignored (normalizeForSearch).
 */
export function searchTags(query: string, { limit = 8, exclude = [] as string[] } = {}): TagInfo[] {
  const q = normalizeForSearch(query).trim();
  if (!q) return [];
  const words = q.split(/\s+/);
  const skip = new Set(exclude);
  const scored: { t: TagInfo; score: number }[] = [];
  for (const t of registry.values()) {
    if (skip.has(t.key)) continue;
    const hay = indexOf(t);
    if (!words.every((w) => hay.includes(w))) continue;
    const names = [t.nameAr, t.nameEn, ...t.aliases].map(normalizeForSearch);
    const score = names.some((n) => n === q) ? 0 : names.some((n) => n.startsWith(q)) ? 1 : names.some((n) => n.split(/\s+/).some((w) => w.startsWith(words[0]))) ? 2 : 3;
    scored.push({ t, score });
  }
  return scored.sort((a, b) => a.score - b.score || a.t.nameEn.length - b.t.nameEn.length).slice(0, limit).map((s) => s.t);
}

/** An approved tag whose name or alias is exactly this text, if any. */
export function exactTag(text: string): TagInfo | null {
  const q = normalizeForSearch(text).trim();
  if (!q) return null;
  for (const t of registry.values()) {
    if ([t.nameAr, t.nameEn, ...t.aliases, t.key].some((n) => normalizeForSearch(n) === q)) return t;
  }
  return null;
}
