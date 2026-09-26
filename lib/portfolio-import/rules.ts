// Reading a portfolio without AI (docs/36): the text of each page (from the
// PDF, or read off the image on the device) plus what its pixels showed.
// Pure and unit-tested.
//
// Covers, "about us", "our services", "our clients" and contact pages are
// recognised by their words; a photo grid is one post made of its photos;
// other work pages become posts, consecutive pages with the same heading (or
// pictures only) joining the project before them.

import { extractNeed } from "@/lib/ai/extract";
import type { CountryCode } from "@/lib/countries";
import { BUILTIN_TAGS } from "@/lib/services/catalog";
import { isServiceKey } from "@/lib/taxonomy";
import { normalizeForSearch } from "@/lib/text";
import { IMPORT_LIMITS, type DraftPost, type ImageRef, type ImportPage, type ImportPlan, type PageKind, type ProfileSuggestion } from "./types";

/** OCR text carries invisible direction marks that glue to words; strip them. */
const plain = (text: string) => text.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");

const has = (text: string, words: string[]) => {
  const t = ` ${normalizeForSearch(plain(text))} `;
  return words.some((w) => t.includes(normalizeForSearch(w)));
};

const ABOUT = ["about us", "who we are", "our story", "من نحن", "نبذة عنا", "قصتنا", "عن الشركة", "عن الوكالة"];
const SERVICES = ["our service", "what we do", "what we offer", "خدماتنا", "ماذا نقدم", "ما نقدمه"];
const CLIENTS = ["our clients", "our client", "clients we", "trusted by", "brands we", "عملاؤنا", "عملائنا", "شركاؤنا", "العملاء"];
const CONTACT = ["contact us", "get in touch", "call us", "تواصل معنا", "اتصل بنا", "للتواصل"];
const COVER = ["portfolio", "company profile", "بورتفوليو", "ملف الشركة", "معرض أعمال", "أعمالنا"];
const CLIENT_LABEL = /^(?:client|brand|for|العميل|عميل|الجهة|لصالح)\s*[:：\-–]\s*(.{2,60})$/i;

const lines = (text: string) =>
  plain(text)
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const words = (text: string) => plain(text).split(/\s+/).filter(Boolean).length;

/** Whether OCR output reads as words: mostly letters, with a real word in it. */
const readable = (t: string) => {
  const chars = t.replace(/\s/g, "");
  const letters = (chars.match(/\p{L}/gu) ?? []).length;
  return chars.length > 0 && letters / chars.length >= 0.7 && /\p{L}{3}/u.test(t) && !/[@©®=[\]{}()<>|/\\]/.test(t);
};

/** The words of the page's first lines: "ABOUT\nUS" and "Our Client" read the same, and a stylised "OUR" the OCR missed doesn't matter. */
const headingWords = (text: string) => new Set(normalizeForSearch(lines(text).slice(0, 3).join(" ")).split(" ").filter(Boolean).slice(0, 12));
const HEADINGS: [PageKind, string[]][] = [
  ["about", ["about us", "who we are", "من نحن", "نبذة"]],
  ["services", ["service", "services", "our service", "our services", "what we do", "خدماتنا", "الخدمات"]],
  ["clients", ["client", "clients", "our client", "our clients", "عملاؤنا", "عملائنا", "العملاء"]],
  ["contact", ["contact", "contact us", "تواصل معنا", "اتصل بنا"]],
];
const numberedLines = (text: string) => lines(text).filter((l) => /^\d{1,2}[.)\-\s]/.test(l)).length;

/**
 * What a page is for. `prev` is the kind of the page before it: a numbered
 * list right after a services page is another service, not a project.
 */
export function classifyPage(p: ImportPage, total: number, prev: PageKind | null = null): PageKind {
  const n = words(p.text);
  if (p.layout === "logos") return "clients";
  if (has(p.text, CONTACT) || (/@|\+?\d[\d\s-]{7,}\d/.test(p.text) && n < 60 && p.index === total - 1)) return "contact";
  if (p.layout === "gallery") return "work";
  // A heading that names the page ("ABOUT US", "OUR CLIENT", "SERVICES") settles it.
  const hw = headingWords(p.text);
  const firstLine = normalizeForSearch(lines(p.text)[0] ?? "");
  const byHeading = HEADINGS.find(([, ws]) => ws.some((w) => normalizeForSearch(w).split(" ").every((x) => hw.has(x))))?.[0] ?? (["about", "عن"].includes(firstLine) ? "about" : undefined);
  if (byHeading === "clients" && n < 80) return "clients";
  if (byHeading === "about" && n >= 15) return "about";
  if (byHeading === "services" || byHeading === "contact") return byHeading;
  if (has(p.text, CLIENTS) && n < 80) return "clients";
  if (has(p.text, ABOUT) && n >= 15) return "about";
  // A services page: says so, or is a numbered list naming several services.
  const numbered = numberedLines(p.text);
  if (has(p.text, SERVICES) || (numbered >= 2 && n >= 12 && servicesIn(p.text, "jo").length >= 2)) return "services";
  // After "our services", text pages describing one service each (a list, a service's name, or a paragraph) continue the section.
  if (prev === "services" && n >= 12 && (numbered >= 1 || servicesIn(p.text, "jo").length >= 1 || (n >= 40 && !clientOf(p.text)))) return "services";
  // A cover: the first page when it says little, or a second title page (a slogan, a quote) naming no client or service.
  if (p.index === 0 && (n < 25 || has(p.text, COVER))) return "cover";
  if (p.index === 1 && prev === "cover" && (n < 40 || has(p.text, COVER)) && !clientOf(p.text) && !servicesIn(p.text, "jo").length) return "cover";
  return "work";
}

/** The page's heading: its first short line, when it reads as words (OCR of a photo grid rarely does). */
export const headingOf = (text: string) => {
  const l = lines(text).find((l) => l.length >= 2 && l.length <= 80) ?? "";
  return readable(l) ? l : "";
};

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

/** The images a page contributes to a post: its photos when it's a grid, else the page itself. */
export const imagesOf = (p: ImportPage): ImageRef[] => (p.layout === "gallery" && p.crops ? Array.from({ length: p.crops }, (_, crop) => ({ page: p.index, crop })) : [{ page: p.index, crop: null }]);

function draftFrom(pages: ImportPage[], country: CountryCode, fallbackServices: string[]): DraftPost {
  const text = pages.map((p) => p.text).join("\n");
  const need = { ...extractNeed(text, country), services: servicesIn(text, country) };
  const heading = headingOf(pages[0].text);
  const gallery = pages.some((p) => p.layout === "gallery");
  // A grid's caption is its heading only: the words around the photos say little.
  const body = gallery ? "" : lines(text).filter((l) => l !== heading).join("\n");
  return {
    pages: pages.map((p) => p.index),
    images: pages.flatMap(imagesOf).slice(0, IMPORT_LIMITS.imagesPerPost),
    title: heading.slice(0, 80),
    caption: [heading, body].filter(Boolean).join("\n\n").slice(0, 2200),
    services: need.services.length ? need.services.slice(0, 4) : fallbackServices.slice(0, 1),
    platforms: need.platforms,
    industry: need.industry,
    client: clientOf(text),
    result: null,
  };
}

/** A logo's wordmark or a listed name, tidied; empty when the text isn't a name. */
export function clientName(raw: string): string {
  const t = plain(raw).replace(/\s+/g, " ").trim();
  if (t.length < 2 || t.length > 40 || t.split(" ").length > 5 || /[.:!?،؟]$/.test(t)) return "";
  if (!/\p{L}{2}/u.test(t)) return "";
  // OCR of a logo: keep it only when it reads as words ("WHITE HALL"), not marks and stray letters.
  if (t.length > 3 && (!readable(t) || t.split(" ").filter((w) => w.length === 1).length > 1)) return "";
  return t;
}

export function profileFrom(pages: ImportPage[], kinds: Record<number, PageKind>, country: CountryCode, agencyServices: string[]): ProfileSuggestion {
  const aboutPage = pages.find((p) => kinds[p.index] === "about");
  const about = aboutPage ? lines(aboutPage.text).filter((l, i) => !has(l, ABOUT) && !(i === 0 && words(l) <= 2)).join(" ").slice(0, 2000) || null : null;
  const clients: ProfileSuggestion["clients"] = [];
  const seen = new Set<string>();
  const add = (name: string, logo?: ImageRef) => {
    const key = normalizeForSearch(name);
    if (name && seen.has(key)) return;
    if (name) seen.add(key);
    clients.push({ name, industry: null, ...(logo ? { logo } : {}) });
  };
  for (const p of pages.filter((p) => kinds[p.index] === "clients")) {
    if (p.layout === "logos" && p.crops) {
      // One entry per logo, named from its wordmark when the OCR read one.
      for (let crop = 0; crop < p.crops; crop++) add(clientName(p.cropTexts?.[crop] ?? ""), { page: p.index, crop });
    } else {
      for (const l of lines(p.text)) if (!has(l, CLIENTS)) add(clientName(l));
    }
  }
  // Services the portfolio talks about (services, about and cover pages) that the agency doesn't list yet.
  const spoken = pages.filter((p) => ["services", "about", "cover"].includes(kinds[p.index])).map((p) => p.text).join("\n");
  const services = servicesIn(spoken, country).filter((s) => !agencyServices.includes(s)).slice(0, 8);
  // The logo on the cover: a single block on an otherwise empty first page.
  const coverLogo = pages.find((p) => p.index <= 1 && kinds[p.index] === "cover" && p.layout === "single" && p.crops);
  return { about, strengths: [], services, clients: clients.slice(0, 30), avatar: coverLogo ? { page: coverLogo.index, crop: 0 } : null };
}

/**
 * Proposes posts and profile details from the pages' text and layout.
 * `agencyServices` tags a work page whose text names no service, and filters
 * the services suggested for the profile.
 */
export function planFromText(pages: ImportPage[], country: CountryCode, agencyServices: string[]): ImportPlan {
  const kinds: Record<number, PageKind> = {};
  let prev: PageKind | null = null;
  for (const p of pages) prev = kinds[p.index] = classifyPage(p, pages.length, prev);
  const drafts: DraftPost[] = [];
  let group: ImportPage[] = [];
  const flush = () => {
    if (group.length) drafts.push(draftFrom(group, country, agencyServices));
    group = [];
  };
  for (const p of pages) {
    if (kinds[p.index] !== "work") {
      flush();
      continue;
    }
    // A photo grid is a post of its own.
    if (p.layout === "gallery") {
      flush();
      group.push(p);
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
  return { mode: "basic", kinds, drafts, profile: profileFrom(pages, kinds, country, agencyServices) };
}
