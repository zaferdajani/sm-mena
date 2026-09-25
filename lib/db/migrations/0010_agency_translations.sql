ALTER TABLE "agencies" ADD COLUMN "content_lang" text DEFAULT 'ar' NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "translation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "translation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_clients" ADD COLUMN "translation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "translation" jsonb DEFAULT '{}'::jsonb NOT NULL;