// Request bodies of the bearer API (docs/architecture/mobile-and-api-roadmap.md §8, slice A). Pure, and built
// from the same lifted schemas the web actions parse with, so a native client meets exactly the web's rules.
import { z } from "zod";
import { MAX_IMAGES_PER_POST } from "@/lib/core/catalog/media-limits";
import { loginSchema } from "./auth";
import { setupClientSchema, setupProjectSchema, setupVersionSchema, uuidSchema } from "./portfolio-setup";

export const apiLoginSchema = loginSchema;

/** PATCH /api/v1/profile: only the fields given change; `version` is the setup draft version the client last saw. */
export const apiProfilePatchSchema = z.object({
  version: setupVersionSchema,
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  services: z.array(z.string().max(60)).max(30).optional(),
  newServices: z.array(z.string().trim().min(1).max(60)).max(5).optional(),
});

/** PATCH /api/v1/portfolio: one step of the draft. Behance and connected-platform sources are not in slice A. */
export const apiPortfolioPatchSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("source"), version: setupVersionSchema, source: z.enum(["upload", "pdf"]) }),
  z.object({ kind: z.literal("client") }).extend(setupClientSchema.shape),
  z.object({ kind: z.literal("project") }).extend(setupProjectSchema.shape),
  z.object({ kind: z.literal("step"), version: setupVersionSchema, step: z.number().int().min(1).max(5) }),
  z.object({ kind: z.literal("pause"), version: setupVersionSchema }),
]);

export const apiPublishSchema = z.object({ version: setupVersionSchema, rights: z.boolean() });

export const apiMediaOrderSchema = z.object({ ids: z.array(uuidSchema).min(1).max(MAX_IMAGES_PER_POST) });

export type ApiLogin = z.infer<typeof apiLoginSchema>;
export type ApiProfilePatch = z.infer<typeof apiProfilePatchSchema>;
export type ApiPortfolioPatch = z.infer<typeof apiPortfolioPatchSchema>;
