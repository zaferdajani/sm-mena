import { z } from "zod";
import { ALL_CITIES } from "@/lib/countries";
import { INDUSTRIES, PLATFORMS } from "@/lib/labels";
import { STEPS, type WizardNeed } from "@/lib/match-wizard";
import { allServices, taxonomy } from "@/lib/taxonomy";

const amount = z.number().int().nonnegative().max(10_000_000).nullable();

/** The guided matchmaker's answers, sent with each /api/match turn (lib/match-wizard.ts). */
export const wizardNeedSchema = z.object({
  groups: z.array(z.enum(taxonomy.categories.map((c) => c.key) as [string, ...string[]])).max(6),
  services: z.array(z.enum(allServices.map((s) => s.key) as [string, ...string[]])).max(12),
  industry: z.enum(INDUSTRIES as unknown as [string, ...string[]]).nullable(),
  platforms: z.array(z.enum(PLATFORMS as unknown as [string, ...string[]])).max(11),
  budgetMin: amount,
  budgetMax: amount,
  city: z.enum(ALL_CITIES as [string, ...string[]]).nullable(),
  answered: z.array(z.enum(STEPS)).max(STEPS.length),
}) satisfies z.ZodType<WizardNeed>;
