ALTER TYPE "public"."support_kind" ADD VALUE IF NOT EXISTS 'complaint' BEFORE 'question';--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN IF NOT EXISTS "screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN IF NOT EXISTS "viewport" text;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN IF NOT EXISTS "app_commit" text;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN IF NOT EXISTS "resolution_commit" text;
