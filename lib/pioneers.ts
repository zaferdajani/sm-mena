import { randomInt } from "node:crypto";

// The Pioneer seal (docs/57): a numbered, permanent mark for the invited first
// names, claimed through a personal letter. Pure rules shared by the landing
// page, sign-up, the admin page and the tests. It is recognition only: no
// money, no ranking, and separate from the Founding seats (docs/39).

export const PIONEER = {
  /** Seals that can ever exist; the number is printed on the letter. */
  cap: 50,
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

export type InvitationState = "open" | "claimed" | "expired";
export function invitationState(i: { claimedAgencyId: string | null; expiresAt: Date }, now = new Date()): InvitationState {
  if (i.claimedAgencyId) return "claimed";
  return i.expiresAt.getTime() < now.getTime() ? "expired" : "open";
}
