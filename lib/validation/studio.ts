// Input contracts of the studio profile and package forms. Pure; shared by the server actions and /api/v1.
import { z } from "zod";
import { CITIES, TEAM_SIZES } from "@/lib/core/catalog/labels";
import { isServiceKey } from "@/lib/core/catalog/taxonomy";

export const studioProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  handle: z.string().trim().toLowerCase(),
  bio: z.string().trim().max(500).default(""),
  about: z.string().trim().max(1500).default(""),
  strengths: z.string().max(1000).default(""),
  city: z.enum(CITIES),
  startingPriceJod: z.union([z.literal(""), z.coerce.number().int().min(0).max(100000)]),
  whatsapp: z.string().trim().max(20),
  phone: z.string().trim().max(20),
  email: z.union([z.literal(""), z.string().trim().email()]),
  website: z.string().trim().max(200),
  instagram: z.string().trim().max(200),
  foundedYear: z.union([z.literal(""), z.coerce.number().int().min(1950).max(new Date().getFullYear())]),
  teamSize: z.union([z.literal(""), z.enum(TEAM_SIZES)]),
});

export const packageSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(""),
  service: z.string().refine(isServiceKey),
  priceJod: z.coerce.number().int().min(1).max(100000),
  billing: z.enum(["monthly", "one_off"]),
  deliverables: z.string().max(1000).default(""),
});

export type StudioProfileInput = z.infer<typeof studioProfileSchema>;
export type PackageInput = z.infer<typeof packageSchema>;
