// Sign-in and sign-up contracts. Pure; the cookie actions and the bearer /api/v1/auth routes parse with the same rules.
import { z } from "zod";
import { CITIES } from "@/lib/core/catalog/labels";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const joinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  handle: z.string().trim().toLowerCase(),
  city: z.enum(CITIES),
  whatsapp: z.string().trim().min(7).max(20),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  consent: z.literal("on"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type JoinInput = z.infer<typeof joinSchema>;
