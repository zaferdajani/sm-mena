ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "content_lang" text DEFAULT 'ar' NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "translation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "translation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_clients" ADD COLUMN IF NOT EXISTS "translation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "translation" jsonb DEFAULT '{}'::jsonb NOT NULL;