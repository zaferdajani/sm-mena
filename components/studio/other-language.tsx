"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { otherLang, type ContentLang } from "@/lib/content-lang";

/** Direction and language attributes for text written in `lang`. */
export const langAttrs = (lang: ContentLang) => ({ lang, dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const) });

/**
 * The optional second-language version of a form's text (fields named `tr_*`,
 * lib/content-lang.ts). `main` is the agency's main language; the fields are
 * in the other one. Open when something is already filled in.
 */
export function OtherLanguage({ main, filled, children }: { main: ContentLang; filled: boolean; children: (attrs: ReturnType<typeof langAttrs>, label: (field: string) => string) => React.ReactNode }) {
  const t = useTranslations("Studio.otherLanguage");
  const other = otherLang(main);
  const language = t(other === "en" ? "english" : "arabic");
  // Names the language in each label, so these fields never share a name with the main ones.
  const label = (field: string) => t("fieldIn", { field, language });
  return (
    <details open={filled} className="group rounded-xl border bg-muted/30 p-4" data-testid="other-language">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <Languages className="size-4 text-brand" aria-hidden />
        {t(other === "en" ? "addEn" : "addAr")}
      </summary>
      <p className="mt-1 text-xs text-muted-foreground">{t("hint", { language })}</p>
      <div className="mt-4 grid gap-4">{children(langAttrs(other), label)}</div>
    </details>
  );
}
