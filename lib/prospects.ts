import { z } from "zod";

// Launch prospects (docs/55): pure rules shared by the admin forms and the data layer.

export const PROSPECT_STATUSES = ["new", "contacted", "replied", "joined", "declined"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

/** One row per business however the name is typed: case, spaces, punctuation and a leading "the" do not count. */
export function prospectKey(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 120);
}

const handle = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, ""))
  .pipe(z.string().regex(/^[a-z0-9._]{1,30}$/i).or(z.literal("")));

const website = z
  .string()
  .trim()
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .pipe(z.string().url().max(200).or(z.literal("")));

export const prospectInput = z.object({
  name: z.string().trim().min(2).max(120),
  website: website.optional().default(""),
  instagram: handle.optional().default(""),
  city: z.string().trim().min(2).max(40).optional().default("amman"),
  services: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  note: z.string().trim().max(1000).optional().default(""),
  priority: z.boolean().optional().default(false),
});
export type ProspectInput = z.infer<typeof prospectInput>;

export const prospectPatch = z.object({
  status: z.enum(PROSPECT_STATUSES).optional(),
  note: z.string().trim().max(1000).optional(),
  priority: z.boolean().optional(),
  website: website.optional(),
  instagram: handle.optional(),
});
export type ProspectPatch = z.infer<typeof prospectPatch>;

/** Comma-separated services typed in the form → list. */
export const splitServices = (raw: string) => raw.split(/[,،]/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
