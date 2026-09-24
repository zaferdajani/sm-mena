// Language registry (idea from OneClickConvert): one place that says which
// languages exist, how each names itself, and which read right to left.
// `enabled` languages are live; the others are ready for the translation
// pipeline (`npm run i18n:translate -- --to fr`) and switch on by adding the
// code to `locales` in i18n/routing.ts once messages/<code>.json is reviewed.

export type LanguageDef = { code: string; label: string; rtl: boolean; enabled: boolean };

export const LANGUAGES: LanguageDef[] = [
  { code: "ar", label: "العربية", rtl: true, enabled: true },
  { code: "en", label: "English", rtl: false, enabled: true },
  { code: "fr", label: "Français", rtl: false, enabled: false },
  { code: "tr", label: "Türkçe", rtl: false, enabled: false },
  { code: "ur", label: "اردو", rtl: true, enabled: false },
  { code: "fa", label: "فارسی", rtl: true, enabled: false },
  { code: "ru", label: "Русский", rtl: false, enabled: false },
  { code: "hi", label: "हिन्दी", rtl: false, enabled: false },
  { code: "id", label: "Bahasa Indonesia", rtl: false, enabled: false },
  { code: "es", label: "Español", rtl: false, enabled: false },
  { code: "de", label: "Deutsch", rtl: false, enabled: false },
  { code: "zh", label: "中文", rtl: false, enabled: false },
];

const byCode = new Map(LANGUAGES.map((l) => [l.code, l]));
export const languageOf = (code: string) => byCode.get(code);
export const isRtl = (code: string) => byCode.get(code)?.rtl ?? false;
