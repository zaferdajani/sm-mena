// Shared by browser and server actions. Personal titles do not become global
// catalog entries. Existing matching keys stay stable.
import catalog from "@/data/service-catalog.json";

export const CUSTOM_ROLE_PREFIX = "custom:";
export const MAX_ROLE_TITLE = 64;
export const MAX_SELECTED_ROLES = 40;
export type RoleOption = { key: string; label: string };

const aliases: Record<string, string[]> = {
  seo_specialist: ["SEO", "S.E.O.", "سيو", "السيو", "مختص سيو", "مختص SEO", "أخصائي SEO", "اخصائي سيو", "خبير سيو", "تحسين محركات البحث", "search engine optimization", "search engine optimisation", "SEO expert"],
  graphic_designer: ["graphic design", "مصمم غرافيك", "مصمم جرافيكس", "جرافيك ديزاينر"],
  motion_designer: ["motion graphics", "motion graphic designer", "مصمم موشن", "موشن جرافيك"],
  video_editor: ["video editing", "مونتير", "محرر فيديو", "مونتاج فيديو"],
  photographer: ["مصور", "مصور فوتوغرافي", "photography"],
  videographer: ["تصوير فيديو", "video photographer"],
  voice_over: ["voice over", "voiceover", "voice over artist", "تعليق صوتي", "معلق صوتى"],
  media_buyer: ["ميديا باير", "مختص إعلانات ممولة", "paid media specialist"],
  web_developer: ["web developer", "مطور مواقع", "مطور ويب"],
  content_creator: ["UGC", "UGC creator", "صانع محتوى", "صانع محتوى UGC"],
};

/** Comparison only: keep the readable spelling in saved personal titles. */
export function normalizeRoleText(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\p{M}/gu, "").replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
export function keepSeoAcronym(text: string): string {
  return text.replace(/(^|[^\p{L}\p{N}])(?:ال)?سيو(?=$|[^\p{L}\p{N}])/gu, "$1SEO").replace(/\bseo\b/gi, "SEO");
}
export function cleanRoleTitle(raw: string): string | null {
  if (typeof raw !== "string" || raw.length > 256 || /[\p{C}<>\[\]{}\\:@]/u.test(raw)) return null;
  const title = keepSeoAcronym(raw.normalize("NFKC").replace(/\s+/g, " ").trim());
  if ([...title].length < 2 || [...title].length > MAX_ROLE_TITLE || !/\p{L}/u.test(title)) return null;
  if (!/^[\p{L}\p{M}\p{N} .,'’،()+/&-]+$/u.test(title)) return null;
  return title;
}
const roles = catalog.roles.map((role) => ({ ...role, name_ar: keepSeoAcronym(role.name_ar), name_en: keepSeoAcronym(role.name_en) }));
const knownKeys = new Set(roles.map((r) => r.key));
const namesFor = (r: typeof roles[number]) => [r.key, r.key.replace(/_/g, " "), r.name_ar, r.name_en, ...(aliases[r.key] ?? [])];
const exactIndex = new Map<string, string>();
const tokenIndex = new Map<string, string>();
const tokenSignature = (text: string) => text.split(" ").sort().join(" ");
for (const role of roles) for (const name of namesFor(role)) {
  const norm = normalizeRoleText(name);
  if (!exactIndex.has(norm)) exactIndex.set(norm, role.key);
  if (!tokenIndex.has(tokenSignature(norm))) tokenIndex.set(tokenSignature(norm), role.key);
}
export function exactRole(text: string): string | null {
  if (typeof text !== "string" || text.length > 256) return null;
  const norm = normalizeRoleText(text);
  return exactIndex.get(norm) ?? tokenIndex.get(tokenSignature(norm)) ?? null;
}
export function roleInputLabel(key: string, locale: string): string {
  const builtin = roles.find((r) => r.key === key);
  if (builtin) return locale === "ar" ? builtin.name_ar : builtin.name_en;
  if (key.startsWith(CUSTOM_ROLE_PREFIX)) {
    const title = cleanRoleTitle(key.slice(CUSTOM_ROLE_PREFIX.length));
    if (title) {
      const existing = exactRole(title);
      return existing ? roleInputLabel(existing, locale) : title;
    }
  }
  return keepSeoAcronym(key);
}
export function customRoleKey(raw: string): string | null {
  const title = cleanRoleTitle(raw);
  return title ? exactRole(title) ?? `${CUSTOM_ROLE_PREFIX}${title}` : null;
}
export function roleIdentity(key: string): string {
  if (knownKeys.has(key)) return key;
  const title = key.startsWith(CUSTOM_ROLE_PREFIX) ? key.slice(CUSTOM_ROLE_PREFIX.length) : key;
  return exactRole(title) ?? `${CUSTOM_ROLE_PREFIX}${normalizeRoleText(title)}`;
}
/** Validate and deduplicate at the trusted write boundary as well as in the UI.
 * A personal specialty is a self-description, not an approved matching category.
 */
export function normalizeRoleSelection(values: readonly string[]): string[] {
  const selected = new Map<string, string>();
  for (const raw of values.slice(0, 200)) {
    if (typeof raw !== "string" || raw.length > 256) continue;
    const key = knownKeys.has(raw) ? raw : raw.startsWith(CUSTOM_ROLE_PREFIX) ? customRoleKey(raw.slice(CUSTOM_ROLE_PREFIX.length)) : exactRole(raw);
    if (!key) continue;
    const identity = roleIdentity(key);
    if (!selected.has(identity) && selected.size < MAX_SELECTED_ROLES) selected.set(identity, key);
  }
  return [...selected.values()];
}
/** Search every catalog role and this provider's own selected titles. Never
 * expose another provider's private custom labels through autocomplete.
 */
export function searchRoles(query: string, locale: string, personal: readonly string[] = [], limit = 8): RoleOption[] {
  const q = normalizeRoleText(query.slice(0, 256));
  if (!q) return [];
  const words = q.split(" ");
  const options = [
    ...roles.map((r) => ({ key: r.key, label: roleInputLabel(r.key, locale), names: namesFor(r) })),
    ...normalizeRoleSelection(personal).filter((key) => key.startsWith(CUSTOM_ROLE_PREFIX)).map((key) => ({ key, label: roleInputLabel(key, locale), names: [roleInputLabel(key, locale)] })),
  ];
  return options.map((option) => {
    const names = option.names.map(normalizeRoleText);
    const exact = names.some((name) => name === q);
    const matches = exact || names.some((name) => words.every((word) => name.includes(word)))
      || names.some((name) => name.length >= 3 && ` ${q} `.includes(` ${name} `));
    return { ...option, score: !matches ? 99 : exact ? 0 : names.some((name) => name.startsWith(q)) ? 1 : 2 };
  }).filter((option) => option.score < 99)
    .sort((a, b) => a.score - b.score || a.label.length - b.label.length || a.key.localeCompare(b.key))
    .slice(0, Math.max(1, Math.min(limit, 20))).map(({ key, label }) => ({ key, label }));
}
