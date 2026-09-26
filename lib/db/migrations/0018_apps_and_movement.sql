ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "app" jsonb;--> statement-breakpoint
ALTER TABLE "portfolio_clients" ADD COLUMN IF NOT EXISTS "confirm_token" text;--> statement-breakpoint
ALTER TABLE "portfolio_clients" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_clients_confirm_token_idx" ON "portfolio_clients" ("confirm_token");
