import { extractNeed } from "@/lib/ai/extract";
import type { CountryCode } from "@/lib/countries";
import { clientOf, servicesIn } from "@/lib/portfolio-import/rules";
import { isServiceKey } from "@/lib/taxonomy";
import { BEHANCE_LIMITS, type BehanceDraft, type BehanceProfile, type BehanceProfileSuggestion, type BehanceProject } from "./types";

// From Behance's words to Sawwiq's lists. Pure, unit-tested; the review
// screen shows every guess and the provider corrects it before publishing.

/** Behance creative fields → Sawwiq services (lower-cased, matched on inclusion). */
const FIELD_SERVICES: [string, string][] = [
  ["social media", "smm_content"],
  ["branding", "brand_identity"],
  ["brand identity", "brand_identity"],
  ["logo", "brand_identity"],
  ["typography", "graphic_design"],
  ["graphic design", "graphic_design"],
  ["illustration", "graphic_design"],
  ["art direction", "brand_strategy"],
  ["packaging", "packaging_design"],
  ["photography", "photography"],
  ["product photography", "photography"],
  ["motion graphics", "motion_graphics"],
  ["animation", "motion_graphics"],
  ["video", "video_production"],
  ["cinematography", "video_production"],
  ["film", "video_production"],
  ["advertising", "ads_meta"],
  ["copywriting", "copywriting"],
  ["web design", "web_design"],
  ["ui/ux", "web_design"],
  ["ux/ui", "web_design"],
  ["interaction design", "web_design"],
  ["app design", "app_development"],
  ["print design", "print_design"],
  ["editorial", "print_design"],
  ["signage", "outdoor_ads"],
  ["exhibition", "activations"],
  ["event", "event_coverage"],
];

/** Services named by Behance fields, tags and text: fields first, then words, deduplicated, at most four. */
export function servicesFor(project: BehanceProject, country: CountryCode): string[] {
  const out: string[] = [];
  const add = (k: string) => {
    if (isServiceKey(k) && !out.includes(k)) out.push(k);
  };
  const labels = [...project.fields, ...project.tags].map((f) => f.toLowerCase());
  for (const [needle, key] of FIELD_SERVICES) if (labels.some((l) => l.includes(needle))) add(key);
  for (const k of servicesIn(`${project.title}\n${project.description}\n${project.tags.join(" ")}`, country)) add(k);
  return out.slice(0, 4);
}

/** "Rose Café — Branding", "Brand identity for Rose Café", "Client: Rose Café": the client, if the title or text says. */
export function clientFor(project: BehanceProject): string | null {
  const labelled = clientOf(project.description) ?? /(?:^|\n)\s*(?:client|customer|العميل|الزبون)\s*[:：]\s*([^\n.،|]{2,60})/iu.exec(project.description)?.[1]?.trim();
  if (labelled) return labelled.slice(0, 80);
  const t = project.title.trim();
  const m = /^(.{2,60}?)\s+[|\-–—:]\s+(.{2,60})$/.exec(t);
  if (m) {
    // "Rose Café | Branding" names the client first; "Branding | Rose Café" names it last.
    const [a, b] = [m[1].trim(), m[2].trim()];
    const isWork = (s: string) => FIELD_SERVICES.some(([needle]) => s.toLowerCase().includes(needle));
    if (isWork(b) && !isWork(a)) return a;
    if (isWork(a) && !isWork(b)) return b;
  }
  const forWhom = /\b(?:for|لـ|لصالح)\s+([A-Z؀-ۿ][^\n|.،]{1,50})$/u.exec(t);
  return forWhom ? forWhom[1].trim() : null;
}

export function draftFor(project: BehanceProject, country: CountryCode, fallbackServices: string[]): BehanceDraft {
  const need = extractNeed(`${project.title}\n${project.description}`, country);
  const services = servicesFor(project, country);
  const caption = [project.title, project.description].filter(Boolean).join("\n\n").slice(0, BEHANCE_LIMITS.caption);
  return {
    project: { ...project, images: project.images.slice(0, BEHANCE_LIMITS.imagesPerProject) },
    caption,
    services: services.length ? services : fallbackServices.slice(0, 1),
    platforms: need.platforms,
    industry: need.industry,
    client: clientFor(project),
  };
}

const host = (url: string | null | undefined) => {
  try {
    return url ? new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, "").toLowerCase() : null;
  } catch {
    return null;
  }
};

/**
 * Whether the Behance profile points back at this provider: its website
 * domain matches, or it links to the provider's Sawwiq page. Unverified is
 * not a block (a provider may not have filled the website field); the review
 * says so and the provider confirms the work is theirs.
 */
export function ownershipOf(profile: BehanceProfile | null, agency: { handle: string; website: string | null; instagram: string | null }): "verified" | "unverified" {
  if (!profile) return "unverified";
  const site = host(agency.website);
  if (site && profile.links.some((l) => host(l) === site)) return "verified";
  const handle = agency.handle.toLowerCase();
  if (profile.links.some((l) => /sawwiq\.org\/(?:ar\/|en\/)?a\//i.test(l) && l.toLowerCase().endsWith(`/${handle}`))) return "verified";
  const ig = agency.instagram?.replace(/^@/, "").toLowerCase();
  if (ig && profile.links.some((l) => /instagram\.com\//i.test(l) && l.toLowerCase().replace(/\/$/, "").endsWith(`/${ig}`))) return "verified";
  return "unverified";
}

export function suggestionFor(profile: BehanceProfile | null, drafts: BehanceDraft[], agency: { about: string; website: string | null; services: string[] }, country: CountryCode): BehanceProfileSuggestion {
  const named = new Set<string>();
  for (const d of drafts) for (const s of d.services) named.add(s);
  if (profile) for (const s of servicesFor({ ...emptyProject, fields: profile.fields, description: profile.bio ?? "" }, country)) named.add(s);
  return {
    about: profile?.bio && !agency.about.trim() ? profile.bio : null,
    website: profile?.website && !agency.website ? profile.website : null,
    avatar: profile?.avatar ?? null,
    services: [...named].filter((s) => !agency.services.includes(s)).slice(0, 6),
  };
}

const emptyProject: BehanceProject = { id: "", url: "", title: "", description: "", cover: null, images: [], fields: [], tags: [], publishedAt: null, owners: [] };
