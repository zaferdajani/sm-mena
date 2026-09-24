import { taxonomy } from "@/lib/taxonomy";

/**
 * "Full service, from A to Z": the agency covers content, paid media and
 * branding, so one team can run a brand end to end (what clients asking for a
 * single accountable team need). Derived from the services agencies list.
 */
export const FULL_SERVICE_GROUPS: string[][] = [
  taxonomy.categories.filter((c) => c.key === "social_media" || c.key === "creative").flatMap((c) => c.services.map((s) => s.key)),
  taxonomy.categories.filter((c) => c.key === "paid_media").flatMap((c) => c.services.map((s) => s.key)),
  taxonomy.categories.filter((c) => c.key === "branding").flatMap((c) => c.services.map((s) => s.key)),
];

export const isFullService = (services: string[]) => FULL_SERVICE_GROUPS.every((g) => g.some((s) => services.includes(s)));
