ALTER TYPE "public"."report_reason" ADD VALUE IF NOT EXISTS 'underage' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age_confirmed_at" timestamp with time zone;
