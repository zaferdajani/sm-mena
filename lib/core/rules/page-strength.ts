// Page strength (docs/65): one definition of "match-ready" and "strong", shared by the Studio
// home, the setup success screen, nudges and metrics. Pure: no database, no translations.
// It only describes a page; it never changes ranking (paid plans add priority, never relevance).

import type { ProfileVisibility } from "@/lib/core/rules/launch-phase";

export type PageFacts = {
  visibility: ProfileVisibility;
  services: string[];
  city: string | null;
  whatsapp: string | null;
  postCount: number;
  bio: string;
  avatarKey: string | null;
  platforms: string[];
  startingPriceJod: number | null;
  packageCount: number;
  /** "Open to new projects" and when the owner last said so (null: never touched since sign-up). */
  acceptingProjects: boolean;
  acceptingUpdatedAt: Date | null;
  createdAt: Date;
};

/** After this long without the owner confirming, the Studio asks "still open to new projects?". */
export const AVAILABILITY_STALE_DAYS = 60;

export function availabilityStale(facts: Pick<PageFacts, "acceptingProjects" | "acceptingUpdatedAt" | "createdAt">, now = new Date()): boolean {
  if (!facts.acceptingProjects) return false;
  const since = facts.acceptingUpdatedAt ?? facts.createdAt;
  return now.getTime() - since.getTime() > AVAILABILITY_STALE_DAYS * 86_400_000;
}

/** The one next thing to do, in the order a new page needs it. */
export type PageStep = "work" | "services" | "whatsapp" | "city" | "publish" | "available" | "intro" | "logo" | "platforms" | "price" | "moreWork";

export type PageStrength = {
  /** Public, reachable and with at least one tagged project: the matchmaker can recommend it. */
  matchReady: boolean;
  /** Match-ready plus an introduction, a picture, platforms, a price or package and 3 projects. */
  strong: boolean;
  /** 0–100, for a meter; it is a checklist score, not a ranking. */
  percent: number;
  /** What to do next, or null when the page is strong. */
  next: PageStep | null;
  missing: PageStep[];
};

const READY_STEPS: { key: PageStep; done: (f: PageFacts) => boolean }[] = [
  { key: "work", done: (f) => f.postCount > 0 },
  { key: "services", done: (f) => f.services.length > 0 },
  { key: "whatsapp", done: (f) => Boolean(f.whatsapp?.trim()) },
  { key: "city", done: (f) => Boolean(f.city?.trim()) },
  { key: "publish", done: (f) => f.visibility === "public" },
  { key: "available", done: (f) => f.acceptingProjects },
];

const STRONG_STEPS: { key: PageStep; done: (f: PageFacts) => boolean }[] = [
  { key: "intro", done: (f) => f.bio.trim().length > 0 },
  { key: "logo", done: (f) => Boolean(f.avatarKey) },
  { key: "platforms", done: (f) => f.platforms.length > 0 },
  { key: "price", done: (f) => f.startingPriceJod !== null || f.packageCount > 0 },
  { key: "moreWork", done: (f) => f.postCount >= 3 },
];

export function pageStrength(facts: PageFacts): PageStrength {
  const missingReady = READY_STEPS.filter((s) => !s.done(facts)).map((s) => s.key);
  const missingStrong = STRONG_STEPS.filter((s) => !s.done(facts)).map((s) => s.key);
  const missing = [...missingReady, ...missingStrong];
  const total = READY_STEPS.length + STRONG_STEPS.length;
  return {
    matchReady: missingReady.length === 0,
    strong: missing.length === 0,
    percent: Math.round(((total - missing.length) / total) * 100),
    next: missing[0] ?? null,
    missing,
  };
}
