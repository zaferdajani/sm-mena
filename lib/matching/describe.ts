import { createTranslator } from "next-intl";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import type { Difference } from "./closeness";
import { diffLines, type DiffLine } from "./describe-core";

export type { DiffLine } from "./describe-core";

/** Server-side wording of the differences (the browser uses diffLines with useTranslations). */
export function describeDifferences(differences: Difference[], locale: string, currency = "JOD"): DiffLine[] {
  const lang = locale === "ar" ? "ar" : "en";
  const messages = lang === "ar" ? ar : en;
  const t = createTranslator({ locale: lang, messages, namespace: "Closest.diff" });
  const all = createTranslator({ locale: lang, messages });
  return diffLines(differences, lang, currency, {
    t: (k, v) => t(k as "inCity", v as never),
    city: (k) => all(`Cities.${k}` as "Cities.amman"),
    platform: (k) => all(`Platforms.${k}` as "Platforms.instagram"),
    industry: (k) => all(`Industries.${k}` as "Industries.other"),
  });
}
