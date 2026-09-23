import { z } from "zod";

// Server-side configuration. Values are optional so the app builds and runs
// with mock providers; code that needs a value calls requireEnv().
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SMS_PROVIDER: z.string().default("mock"),
  WHATSAPP_PROVIDER: z.enum(["mock", "meta"]).default("mock"),
  PSP_PROVIDER: z.enum(["mock", "hyperpay", "meps"]).default("mock"),
});

export const env = schema.parse(process.env);

export function requireEnv<K extends keyof typeof env>(
  key: K,
): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing environment variable ${String(key)}. See .env.example.`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
