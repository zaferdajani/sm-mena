// Input contracts of the first-run portfolio wizard (docs/architecture/mobile-and-api-roadmap.md §3 step 3).
// Pure: the server actions and the future /api/v1 handlers both parse with these, so a native client sees
// exactly the same rules as the web form.
import { z } from "zod";
import { BEHANCE_LIMITS } from "@/lib/behance/types";
import { MAX_IMAGES_PER_POST } from "@/lib/core/catalog/media-limits";

export const SETUP_SOURCES = ["upload", "pdf", "behance", "social"] as const;

/** The draft version the browser last saw; a save on another version is stale. */
export const setupVersionSchema = z.coerce.number().int().min(0);
export const uuidSchema = z.string().uuid();
export const setupSourceSchema = z.enum(SETUP_SOURCES);

export const setupProfileSchema = z.object({
  version: setupVersionSchema,
  name: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500),
});

export const setupBehanceSchema = z.object({
  projectUrl: z.string().url().max(500),
  images: z.array(z.string().url().max(1000)).min(1).max(Math.min(MAX_IMAGES_PER_POST, BEHANCE_LIMITS.imagesPerProject)),
  title: z.string().max(200),
  caption: z.string().max(BEHANCE_LIMITS.caption),
  client: z.string().max(80).nullable(),
  publishedAt: z.string().datetime().nullable().optional(),
});

export const setupClientSchema = z.object({
  version: setupVersionSchema,
  mode: z.enum(["existing", "new", "personal", "private"]),
  clientId: z.string().uuid().optional(),
  name: z.string().max(80).optional(),
});

export const setupProjectSchema = z.object({
  version: setupVersionSchema,
  title: z.string().trim().min(2).max(120),
  contribution: z.string().trim().min(2).max(600),
  services: z.array(z.string().max(60)).min(1).max(6),
  behanceImages: z.array(z.string().url().max(1000)).max(MAX_IMAGES_PER_POST).optional(),
});

export type SetupProfileInput = z.infer<typeof setupProfileSchema>;
export type SetupBehanceInput = z.infer<typeof setupBehanceSchema>;
export type SetupClientInput = z.infer<typeof setupClientSchema>;
export type SetupProjectInput = z.infer<typeof setupProjectSchema>;
