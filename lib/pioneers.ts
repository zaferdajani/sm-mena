import { randomInt } from "node:crypto";

// The Pioneer seal (docs/57): a numbered, permanent mark for the invited first
// names, claimed through a personal letter. Pure rules shared by the landing
// page, sign-up, the admin page and the tests. It is recognition only: no
// money, no ranking, and separate from the Founding seats (docs/39).

export const PIONEER = {
  /** Seals that can ever exist; the number is printed on the letter. */
  cap: 50,
  /** Letters that can be printed; more letters than medals is the point: the first fifty to claim win. */
  letterCap: 300,
  /** Days a letter's reservation holds from the day the invitation is created. */
  inviteDays: 21,
  /** The cookie that carries the letter's code from the landing page to sign-up. */
  cookie: "sw_pioneer",
  cookieDays: 30,
} as const;

/** Letter codes: 8 lower-case characters without look-alikes (no 0/o, 1/l/i). */
export const PIONEER_CODE = /^[a-hj-km-np-z2-9]{8}$/;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function newPioneerCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const normalizePioneerCode = (raw: unknown) => (typeof raw === "string" ? raw.trim().toLowerCase() : "");
export const isPioneerCode = (raw: unknown) => PIONEER_CODE.test(normalizePioneerCode(raw));

/** 12 → "012" / "٠١٢": the number as printed on the seal. */
export function sealNumber(n: number, locale: string): string {
  const padded = String(Math.max(0, Math.trunc(n))).padStart(3, "0");
  return locale === "ar" ? padded.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : padded;
}

/** Plain digits in the page's script ("50" / "٥٠"). */
export const localizeDigits = (n: number, locale: string) => (locale === "ar" ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : String(n));

export const inviteExpiry = (from = new Date()) => new Date(from.getTime() + PIONEER.inviteDays * 24 * 3600 * 1000);

/**
 * What a page needs before it earns the medal: a page buyers can actually use, with
 * real content in it. The setup steps fill all of it (profile, services, a project);
 * prices and platforms come from the Studio profile or a package.
 */
export const MEDAL_ITEMS = ["logo", "bio", "services", "platforms", "price", "contact", "project"] as const;
export type MedalItem = (typeof MEDAL_ITEMS)[number];
export const MEDAL_BIO_MIN = 40;
export type MedalInput = {
  avatarKey: string | null;
  bio: string;
  services: string[];
  platforms: string[];
  startingPriceJod: number | null;
  packageCount: number;
  whatsapp: string | null;
  /** Published projects with at least one image or video. */
  projectCount: number;
};
export function medalChecklist(a: MedalInput): { item: MedalItem; done: boolean }[] {
  const done: Record<MedalItem, boolean> = {
    logo: Boolean(a.avatarKey),
    bio: a.bio.trim().length >= MEDAL_BIO_MIN,
    services: a.services.length > 0,
    platforms: a.platforms.length > 0,
    price: (a.startingPriceJod ?? 0) > 0 || a.packageCount > 0,
    contact: Boolean(a.whatsapp?.trim()),
    project: a.projectCount > 0,
  };
  return MEDAL_ITEMS.map((item) => ({ item, done: done[item] }));
}
export const medalReady = (a: MedalInput) => medalChecklist(a).every((c) => c.done);

/**
 * open: can still be registered from · linked: registered, the page is being completed (the
 * medal is not theirs yet) · claimed: completed in time, medal №number · late: the fifty medals
 * went to pages that finished first · expired: the letter's window to register passed ·
 * full: never registered, and the fifty medals are already taken.
 */
export type InvitationState = "open" | "linked" | "claimed" | "late" | "expired" | "full";
export function invitationState(i: { claimedAgencyId: string | null; number: number | null; expiresAt: Date }, medalsLeft: number, now = new Date()): InvitationState {
  if (i.claimedAgencyId) return i.number ? "claimed" : medalsLeft > 0 ? "linked" : "late";
  if (i.expiresAt.getTime() < now.getTime()) return "expired";
  return medalsLeft > 0 ? "open" : "full";
}
