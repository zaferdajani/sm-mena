// Reading a portfolio without AI: page text only. Pure and unit-tested.
// Covers, contact pages, "about us" and "our clients" pages are recognised by
// their words; every other page is work, and consecutive work pages with the
// same heading become one post (up to 10 images).

import { extractNeed } from "@/lib/ai/extract";
import type { CountryCode } from "@/lib/countries";
import { BUILTIN_TAGS } from "@/lib/services/catalog";
import { isServiceKey } from "@/lib/taxonomy";
import { normalizeForSearch } from "@/lib/text";
import { IMPORT_LIMITS, type DraftPost, type ImportPage, type ImportPlan, type PageKind, type ProfileSuggestion } from "./types";

const has = (text: string, words: string[]) => {
  const t = ` ${normalizeForSearch(text)} `;
  return words.some((w) => t.includes(normalizeForSearch(w)));
};

const ABOUT = ["about us", "who we are", "our story", "من نحن", "نبذة عنا", "قصتنا", "عن الشركة", "عن الوكالة"];
const CLIENTS = ["our clients", "clients we", "trusted by", "brands we", "عملاؤنا", "عملائنا", "شركاؤنا", "العملاء"];
const CONTACT = ["contact us", "get in touch", "call us", "تواصل معنا", "اتصل بنا", "للتواصل"];
const COVER = ["portfolio", "company profile", "بورتفوليو", "ملف الشركة", "معرض أعمال", "أعمالنا"];
const CLIENT_LABEL = /^(?:client|brand|for|العميل|عميل|الجهة|لصالح)\s*[:：\-–]\s*(.{2,60})$/i;

const lines = (text: string) =>
  text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

export function classifyPage(p: ImportPage, total: number): PageKind {
  const words = p.text.split(/\s+/).filter(Boolean).length;
  if (has(p.text, CONTACT) || (/@|\+?\d[\d\s-]{7,}\d/.test(p.text) && words < 60 && p.index === total - 1)) return "contact";
  if (has(p.text, ABOUT) && words >= 15) return "about";
  if (has(p.text, CLIENTS)) return "clients";
  if (p.index === 0 && (words < 25 || has(p.text, COVER))) return "cover";
  return "work";
}

/** The page's heading: its first short line. */
const headingOf = (text: string) => lines(text).find((l) => l.length >= 2 && l.length <= 80) ?? "";

/** A client named on the page ("Client: Rose Café"), if any. */
export function clientOf(text: string): string | null {
  for (const l of lines(text)) {
    const m = CLIENT_LABEL.exec(l);
    if (m) return m[1].trim();
  }
  return null;
}

/** Core services named anywhere in the text: the matchmaker's keywords plus every catalog name and alias. */
export function servicesIn(text: string, country: CountryCode): string[] {
  const t = ` ${normalizeForSearch(text)} `;
  const found = new Set(extractNeed(text, country).services);
  for (const tag of BUILTIN_TAGS) {
    if (!tag.parent || !isServiceKey(tag.parent)) continue;
    const names = [tag.nameEn, tag.nameAr, ...tag.aliases].map((n) => normalizeForSearch(n)).filter((n) => n.length >= 4);
    // Whole words; a longer name may also start a longer word (plurals, Arabic attached endings).
    if (names.some((n) => t.includes(` ${n} `) || (n.length >= 6 && t.includes(` ${n}`)))) found.add(tag.parent);
  }
  return [...found];
}

function draftFrom(pages: ImportPage[], country: CountryCode, fallbackServices: string[]): DraftPost {
  const text = pages.map((p) => p.text).join("\n");
  const need = { ...extractNeed(text, country), services: servicesIn(text, country) };
  const heading = headingOf(pages[0].text);
  const body = lines(text).filter((l) => l !== heading).join("\n");
  return {
    pages: pages.map((p) => p.index),
    title: heading.slice(0, 80),
    caption: [heading, body].filter(Boolean).join("\n\n").slice(0, 2200),
    services: need.services.length ? need.services.slice(0, 4) : fallbackServices.slice(0, 1),
    platforms: need.platforms,
    industry: need.industry,
    client: clientOf(text),
    result: null,
  };
}

export function profileFrom(pages: ImportPage[], kinds: Record<number, PageKind>): ProfileSuggestion {
  const aboutPage = pages.find((p) => kinds[p.index] === "about");
  const about = aboutPage ? lines(aboutPage.text).filter((l) => !has(l, ABOUT)).join(" ").slice(0, 2000) || null : null;
  const clientPages = pages.filter((p) => kinds[p.index] === "clients");
  const names = clientPages
    .flatMap((p) => lines(p.text))
    .filter((l) => !has(l, CLIENTS) && l.length >= 2 && l.length <= 40 && l.split(" ").length <= 5 && !/[.:!?،؟]$/.test(l));
  const clients = [...new Set(names)].slice(0, 30).map((name) => ({ name, industry: null }));
  return { about, strengths: [], clients };
}

/**
 * Proposes posts and profile details from page text alone. `fallbackServices`
 * (the agency's own) tags a work page whose text names no service.
 */
export function planFromText(pages: ImportPage[], country: CountryCode, fallbackServices: string[]): ImportPlan {
  const kinds: Record<number, PageKind> = {};
  for (const p of pages) kinds[p.index] = classifyPage(p, pages.length);
  const drafts: DraftPost[] = [];
  let group: ImportPage[] = [];
  const flush = () => {
    if (group.length) drafts.push(draftFrom(group, country, fallbackServices));
    group = [];
  };
  for (const p of pages) {
    if (kinds[p.index] !== "work") {
      flush();
      continue;
    }
    // Same heading as the project so far, or a page of pictures only: more images of the same project.
    const heading = headingOf(p.text);
    const sameProject = group.length > 0 && group.length < IMPORT_LIMITS.imagesPerPost && (heading === "" || heading === headingOf(group[0].text));
    if (!sameProject) flush();
    group.push(p);
  }
  flush();
  return { mode: "basic", kinds, drafts, profile: profileFrom(pages, kinds) };
}
