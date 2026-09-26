import { z } from "zod";

/** Sign-in details (Security page): shared by the form and the server action. */
export const changeEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
  code: z.string().trim().max(32).optional().default(""),
});

export const changePasswordSchema = z
  .object({
    password: z.string().min(1).max(200),
    newPassword: z.string().min(8).max(200),
    confirm: z.string().max(200),
    code: z.string().trim().max(32).optional().default(""),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"] });
